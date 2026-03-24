import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import type { ChatMessage } from "@/types/finance";
import { Send, Lock, Bot, User } from "lucide-react";

export function AIChatBot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "I'm your WealthPilot AI advisor. I give direct, no-nonsense financial advice. Ask me anything about your finances — I won't sugarcoat it.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateResponse = (userMessage: string): string => {
    const lower = userMessage.toLowerCase();

    if (lower.includes("save") || lower.includes("saving")) {
      return "Here's the truth: if your savings rate is below 20%, you're not saving — you're surviving. Track every rupee for 30 days. Cut subscriptions you forgot about. Cook more, eat out less. Automate a transfer to a separate savings account on salary day. No willpower needed — just systems.";
    }
    if (lower.includes("loan") || lower.includes("prepay")) {
      return "Before prepaying any loan, check the interest rate. If it's above 10% (personal loans, credit cards), prepay aggressively. Home loans below 8%? Invest the surplus in index funds instead — you'll likely earn more. But first: do you have 6 months of expenses in liquid savings? If not, build that before any prepayment.";
    }
    if (lower.includes("invest")) {
      return "Stop chasing hot stocks. Here's what works: 1) Build emergency fund (6 months expenses). 2) Max out PPF/EPF for guaranteed returns. 3) Put remaining in Nifty 50 index fund via SIP. 4) Only after all this, explore individual stocks. Your risk appetite doesn't matter if your foundation is weak.";
    }
    if (lower.includes("debt") || lower.includes("credit card")) {
      return "Credit card debt is financial poison — 36-42% annual interest. Stop using credit cards immediately. Pay minimum on all debts, throw everything extra at the highest-interest debt first (avalanche method). Once credit cards are clear, you've basically given yourself a 40% return on investment.";
    }

    return "Let me be direct: I need more context. Tell me about your specific situation — your income, debts, investments, and what's keeping you up at night financially. Generic advice is useless. Ask me something specific like 'Should I prepay my home loan?' or 'How should I invest ₹10,000/month?'";
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      const response = generateResponse(userMsg.content);
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
      setLoading(false);
    }, 800);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="neu-card flex flex-col h-[500px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          AI Financial Advisor
        </h3>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Lock className="w-3 h-3" /> Premium features coming soon
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "neu-pressed text-foreground"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="neu-pressed rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          className="neu-input flex-1 text-sm text-foreground"
          placeholder="Ask about your finances..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="neu-button-primary px-4 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
