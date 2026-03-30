import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-03-25.dahlia",
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/create-checkout-session", async (req, res) => {
    console.log("Received request to create checkout session");
    const { priceId, userId, planName } = req.body;
    console.log("Request body:", req.body);
    console.log("APP_URL:", process.env.APP_URL);
    
    if (!priceId || !userId) {
      console.error("Missing required fields in request body");
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!process.env.APP_URL) {
      console.error("APP_URL is not defined");
      return res.status(500).json({ error: "Server configuration error" });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${process.env.APP_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/dashboard?canceled=true`,
        client_reference_id: userId,
        metadata: {
          planName: planName || "Unknown Plan",
        },
      });
      console.log("Session created:", session.url);
      res.json({ url: session.url });
    } catch (error) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/process-payment", async (req, res) => {
    console.log("Received request to process payment");
    const { userId, planName, paymentMethod } = req.body;
    console.log("Request body:", req.body);
    
    if (!userId || !planName || !paymentMethod) {
      console.error("Missing required fields in request body");
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Simulate payment processing
      console.log(`Processing ${paymentMethod} payment for user ${userId} and plan ${planName}`);
      
      // In a real app, you would integrate with a payment provider here.
      // For now, we simulate success.
      res.json({ success: true });
    } catch (error) {
      console.error("Payment error:", error);
      res.status(500).json({ error: "Failed to process payment" });
    }
  });

  app.get("/api/verify-session", async (req, res) => {
    const { session_id } = req.query;
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id as string);
      res.json({ 
        userId: session.client_reference_id,
        planName: session.metadata?.planName,
        status: session.payment_status 
      });
    } catch (error) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: "Failed to verify session" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
