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
      <div className="flex justify-center my-4">
        <span className="text-xs text-gray-500 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex w-full mb-6 ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[85%] md:max-w-[70%] ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center mt-1 overflow-hidden ${
          isBot ? 'mr-3 ring-2 ring-flow-accent' : 'bg-gray-700 text-gray-300 ml-3'
        }`}>
          {isBot ? (
             <img 
               src={FLOWI_AVATAR_URL} 
               alt="Flowi" 
               className="h-full w-full object-cover"
               onError={(e) => {
                  e.currentTarget.src = FLOWI_AVATAR_FALLBACK;
               }}
             />
          ) : (
             <User size={18} />
          )}
        </div>

        {/* Bubble */}
        <div className={`p-4 rounded-2xl shadow-md text-sm md:text-base leading-relaxed overflow-hidden ${
          isBot 
            ? 'bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700' 
            : 'bg-flow-accent text-white rounded-tr-none'
        }`}>
          {isBot ? (
             <div className="prose prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 max-w-none">
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