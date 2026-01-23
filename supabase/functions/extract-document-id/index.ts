import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, documentType } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "Image is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create prompt based on document type
    let extractionPrompt = "";
    switch (documentType) {
      case "aadhar":
        extractionPrompt = "Extract the 12-digit Aadhar number from this Aadhar card image. Return ONLY the 12-digit number with no spaces, dashes, or other text. If you cannot find a valid Aadhar number, return 'NOT_FOUND'.";
        break;
      case "driving_license":
        extractionPrompt = "Extract the driving license number from this driving license image. Return ONLY the license number (alphanumeric) with no spaces or other text. If you cannot find a valid license number, return 'NOT_FOUND'.";
        break;
      case "pan_card":
        extractionPrompt = "Extract the PAN card number from this PAN card image. Return ONLY the 10-character alphanumeric PAN number with no spaces or other text. If you cannot find a valid PAN number, return 'NOT_FOUND'.";
        break;
      case "bank_passbook":
        extractionPrompt = "Extract the bank account number from this bank passbook image. Return ONLY the account number (numeric) with no spaces or other text. If you cannot find a valid account number, return 'NOT_FOUND'.";
        break;
      case "gas_bill":
        extractionPrompt = "Extract the consumer number or account number from this gas bill image. Return ONLY the consumer/account number with no spaces or other text. If you cannot find a valid number, return 'NOT_FOUND'.";
        break;
      default:
        extractionPrompt = "Extract the primary identification number from this document image. Return ONLY the number with no spaces or other text. If you cannot find a valid number, return 'NOT_FOUND'.";
    }

    console.log(`Processing ${documentType} document for OCR`);

    // Call Lovable AI Gateway with vision model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: extractionPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to process image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content?.trim() || "";

    console.log(`Extracted text: ${extractedText}`);

    // Clean up the extracted ID
    let extractedId = extractedText.replace(/[^a-zA-Z0-9]/g, "");

    if (extractedId === "NOTFOUND" || extractedId === "") {
      return new Response(
        JSON.stringify({ extractedId: null, message: "Could not extract ID from document" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ extractedId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error processing document:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
