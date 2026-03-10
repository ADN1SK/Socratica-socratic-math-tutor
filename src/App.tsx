import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import Markdown from 'react-markdown';
import { 
  Camera, 
  Upload, 
  Send, 
  RefreshCw, 
  HelpCircle, 
  ChevronRight,
  MessageCircle,
  Sparkles,
  X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  role: 'user' | 'model';
  content: string;
  isStep?: boolean;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateResponse = async (userMessage: string, isWhyRequest: boolean = false) => {
    if (!userMessage && !image && !isWhyRequest) return;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    setIsLoading(true);
    setIsThinking(true);

    const newMessages: Message[] = [...messages];
    if (userMessage) {
      newMessages.push({ role: 'user', content: userMessage });
      setMessages(newMessages);
    }

    try {
      const systemInstruction = `You are Socratica, a compassionate and patient Socratic math tutor. 
      Your goal is to guide students through calculus and algebra problems without giving the full answer immediately.
      
      RULES:
      1. Be extremely patient, warm, and encouraging. Use a gentle, scholarly tone.
      2. When a problem is first presented (via image or text), identify the core concept but only walk the student through the FIRST step.
      3. Ask a guiding question at the end of each response to prompt the student's thinking.
      4. If the student asks "Why did we do that?" or expresses confusion about a specific step, explain the underlying mathematical concept or intuition behind that step clearly and simply. Use analogies if helpful.
      5. Never show the final solution unless the student has successfully navigated all previous steps.
      6. Use LaTeX-style formatting for math (e.g., $x^2$, $\\int f(x) dx$) where appropriate, as it will be rendered in Markdown.
      7. If an image is provided, describe what you see in the problem first to confirm understanding.`;

      const contents: any[] = [];
      
      // Add history
      messages.forEach(msg => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      });

      // Add current message/image
      const currentParts: any[] = [];
      if (image && messages.length === 0) {
        const base64Data = image.split(',')[1];
        currentParts.push({
          inlineData: {
            mimeType: "image/png",
            data: base64Data
          }
        });
      }
      
      if (isWhyRequest) {
        currentParts.push({ text: "Why did we do that? Please explain the reasoning behind the last step you suggested." });
      } else if (userMessage) {
        currentParts.push({ text: userMessage });
      }

      contents.push({
        role: 'user',
        parts: currentParts
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: contents,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        },
      });

      const text = response.text || "I'm sorry, I'm having a bit of trouble thinking right now. Could we try that again?";
      setMessages(prev => [...prev, { role: 'model', content: text, isStep: !isWhyRequest }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: 'model', content: "Oh dear, it seems I've lost my train of thought. Let's try that again, shall we?" }]);
    } finally {
      setIsLoading(false);
      setIsThinking(false);
      setInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateResponse(input);
  };

  const handleWhyClick = () => {
    generateResponse('', true);
  };

  const isLastMessageStep = messages.length > 0 && messages[messages.length - 1].role === 'model' && messages[messages.length - 1].isStep;

  return (
    <div className="min-h-screen flex flex-col max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-warm-accent text-white rounded-full mb-4 shadow-lg">
          <Sparkles size={28} />
        </div>
        <h1 className="text-4xl font-serif font-bold text-stone-800 mb-2">Socratica</h1>
        <p className="text-stone-600 font-serif italic">Your patient guide through the world of mathematics.</p>
      </header>

      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden flex flex-col mb-6">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {messages.length === 0 && !image && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60 py-12">
              <div className="p-6 bg-stone-50 rounded-full">
                <MessageCircle size={48} className="text-stone-400" />
              </div>
              <div className="max-w-xs">
                <p className="font-serif text-lg">Upload a photo of your math problem or type it below to begin our journey.</p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={cn(
                "flex flex-col max-w-[85%]",
                msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div 
                className={cn(
                  "px-5 py-3 rounded-2xl text-sm md:text-base",
                  msg.role === 'user' 
                    ? "bg-warm-accent text-white rounded-tr-none" 
                    : "bg-stone-100 text-stone-800 rounded-tl-none border border-stone-200"
                )}
              >
                <div className="markdown-body">
                  <Markdown>{msg.content}</Markdown>
                </div>
              </div>
              <span className="text-[10px] uppercase tracking-widest mt-1 opacity-40 font-semibold px-2">
                {msg.role === 'user' ? 'You' : 'Socratica'}
              </span>
            </div>
          ))}

          {isLoading && (
            <div className="flex flex-col items-start mr-auto max-w-[85%]">
              <div className="px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl rounded-tl-none flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                {isThinking && <span className="text-xs font-serif italic text-stone-500">Pondering the concepts...</span>}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Action Bar (Contextual) */}
        {isLastMessageStep && !isLoading && (
          <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 flex justify-center">
            <button 
              onClick={handleWhyClick}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-stone-200 rounded-full text-stone-700 hover:bg-stone-100 transition-colors text-sm font-medium shadow-sm"
            >
              <HelpCircle size={16} className="text-warm-accent" />
              <span>Why did we do that?</span>
            </button>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-stone-100">
          {image && (
            <div className="mb-4 relative inline-block">
              <img src={image} alt="Problem" className="h-24 w-24 object-cover rounded-xl border-2 border-warm-accent shadow-md" />
              <button 
                onClick={clearImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-stone-500 hover:text-warm-accent hover:bg-stone-100 rounded-full transition-all"
              title="Upload Image"
            >
              <Camera size={24} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
            
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your struggle..."
              className="flex-1 px-5 py-3 bg-stone-50 border border-stone-200 rounded-full focus:outline-none focus:ring-2 focus:ring-warm-accent/20 focus:border-warm-accent transition-all font-sans"
              disabled={isLoading}
            />
            
            <button 
              type="submit"
              disabled={isLoading || (!input && !image)}
              className={cn(
                "p-3 rounded-full transition-all shadow-md",
                (isLoading || (!input && !image)) 
                  ? "bg-stone-200 text-stone-400 cursor-not-allowed" 
                  : "bg-warm-accent text-white hover:bg-stone-700 active:scale-95"
              )}
            >
              <Send size={24} />
            </button>
          </form>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="text-center text-stone-400 text-xs font-serif">
        <p>&copy; 2026 Socratica • Built for curious minds</p>
      </footer>
    </div>
  );
}
