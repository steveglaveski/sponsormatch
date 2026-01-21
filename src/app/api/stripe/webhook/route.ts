import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe, STRIPE_WEBHOOK_SECRET, getTierFromPriceId } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { SubscriptionTier } from "@/lib/subscription";

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 }
    );
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancelled(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier as SubscriptionTier | undefined;

  if (!userId || !tier) {
    console.error("Missing metadata in checkout session");
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: tier,
      emailsSent: 0, // Reset email count on new subscription
      contactReveals: 0, // Reset contact reveals on new subscription
    },
  });

  // Record the payment
  if (session.payment_intent && typeof session.payment_intent === "string") {
    await prisma.payment.create({
      data: {
        userId,
        stripePaymentId: session.payment_intent,
        amount: session.amount_total || 0,
        currency: session.currency?.toUpperCase() || "AUD",
        status: "succeeded",
        tier,
      },
    });
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    // Try to find user by customer ID
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: subscription.customer as string },
    });
    if (!user) return;

    const priceId = subscription.items.data[0]?.price.id;
    const tier = priceId ? getTierFromPriceId(priceId) : null;

    if (tier && subscription.status === "active") {
      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionTier: tier },
      });
    }
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const tier = priceId ? getTierFromPriceId(priceId) : null;

  if (tier && subscription.status === "active") {
    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: tier },
    });
  }
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: subscription.customer as string },
  });

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionTier: "FREE" },
    });
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Cast to access properties that may not be in type definitions
  const invoiceData = invoice as unknown as {
    subscription?: string;
    customer?: string | { id: string };
    payment_intent?: string | { id: string };
    amount_paid: number;
    currency: string;
    id: string;
  };

  // Only process subscription invoices
  if (!invoiceData.subscription) return;

  const customerId = typeof invoiceData.customer === "string"
    ? invoiceData.customer
    : invoiceData.customer?.id;

  if (!customerId) return;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (user) {
    // Reset monthly counts on successful renewal
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailsSent: 0,
        contactReveals: 0,
      },
    });

    // Record payment if payment_intent exists
    const paymentIntentId = typeof invoiceData.payment_intent === "string"
      ? invoiceData.payment_intent
      : invoiceData.payment_intent?.id;

    if (paymentIntentId) {
      await prisma.payment.create({
        data: {
          userId: user.id,
          stripePaymentId: paymentIntentId,
          amount: invoiceData.amount_paid,
          currency: invoiceData.currency.toUpperCase(),
          status: "succeeded",
          tier: user.subscriptionTier,
        },
      });
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Could send a notification email here
  console.log("Payment failed for invoice:", invoice.id);
}
