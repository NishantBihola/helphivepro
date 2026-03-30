export const createCheckoutSession = async (priceId: string, userId: string, planName: string) => {
  try {
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ priceId, userId, planName }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed response:", errorText);
      throw new Error("Failed to create checkout session");
    }

    const responseText = await response.text();
    console.log("Response text:", responseText);
    if (!responseText) {
      throw new Error("Empty response from server");
    }
    const { url } = JSON.parse(responseText);
    return url;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
  }
};

export const verifySession = async (sessionId: string) => {
  try {
    const response = await fetch(`/api/verify-session?session_id=${sessionId}`);
    if (!response.ok) {
      throw new Error("Failed to verify session");
    }
    return await response.json();
  } catch (error) {
    console.error("Error verifying session:", error);
    throw error;
  }
};
