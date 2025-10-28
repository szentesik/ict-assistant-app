import OpenAI from "openai";
import { ModelProvider, ModelUsage } from "rerank";
import { performance } from "perf_hooks";

/**
 * Helicone proxy provider for rerank-ts library
 */
export class ProviderHelicone implements ModelProvider {
  model: string;
  apiKey: string;

  name = "helicone";
  validModels = ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-5", "gpt-5-mini", "gpt-5-nano"];
  
  /**
   * Creates an LLM Re-Ranker provider using Helicone proxy.
   * @param model One of the supported models. See https://www.helicone.ai/models for details, only openAI is supported.
   * @param apiKey Helicone API key
   */
  constructor(model: string, apiKey: string) {
    this.model = model;
    this.apiKey = apiKey;
  }

  /**
   * Creates a completion request using the required SDK.
   * @param input Prompt to infer the completion.
   * @returns Text completion from the language model.
   */
  public async infer(
    input: string
  ): Promise<{ output: string; usage: ModelUsage }> {
    const client = new OpenAI({ 
        baseURL: 'https://ai-gateway.helicone.ai',
        apiKey: this.apiKey 
    });

    const startTime = performance.now();
    const completion = await client.chat.completions.create({
        messages: [{ role: "user", content: input }],
        model: this.model,        
    });
    const completionTime = performance.now() - startTime;

    return {
      output: completion.choices[0]?.message?.content || "",      
      usage: {
        completionTokens: completion.usage?.completion_tokens,
        promptTokens: completion.usage?.prompt_tokens,
        completionTime,
      },
    };
  }
}