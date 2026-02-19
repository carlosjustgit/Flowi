import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import { User } from 'lucide-react';
import { FLOWI_AVATAR_URL, FLOWI_AVATAR_FALLBACK } from '../constants';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isBot = message.role === 'model';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-5">
        <span className="inline-flex items-center gap-2 text-xs text-flow-charcoal bg-flow-accent border border-flow-accentHover px-4 py-1.5 rounded-full font-semibold">
          <span className="w-1 h-1 rounded-full bg-flow-charcoal"></span>
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex w-full mb-5 animate-fade-in ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[88%] md:max-w-[72%] ${isBot ? 'flex-row' : 'flex-row-reverse'} items-end gap-2.5`}>

        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center mb-0.5 ${
          isBot
            ? 'ring-2 ring-flow-accent shadow-glow-purple'
            : 'bg-flow-700 ring-1 ring-flow-600'
        }`}>
          {isBot ? (
            <img
              src={FLOWI_AVATAR_URL}
              alt="Flowi"
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = FLOWI_AVATAR_FALLBACK; }}
            />
          ) : (
            <User size={15} className="text-gray-400" />
          )}
        </div>

        {/* Bubble */}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isBot
            ? 'bg-flow-800 text-white rounded-bl-sm border border-flow-700/60'
            : 'bg-flow-accent text-flow-charcoal font-medium rounded-br-sm'
        }`}>
          {isBot ? (
            <div className="prose prose-invert prose-sm prose-p:my-1 prose-p:leading-relaxed prose-headings:my-1.5 prose-ul:my-1 prose-li:my-0.5 max-w-none">
              <ReactMarkdown>{message.text}</ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.text}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
