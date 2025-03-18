import { useEffect, useRef, useState } from 'react';
import { useForm } from '@inertiajs/react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
// Using divs with Tailwind instead of Card components
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, ChevronUp, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Message {
    id: number;
    content: string;
    user: {
        id: number;
        name: string;
    };
    created_at: string;
}

export default function Shoutbox() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { data, setData, reset, processing } = useForm({
        content: '',
    });

    const fetchMessages = async () => {
        try {
            const response = await axios.get('/api/messages');
            setMessages(response.data);
            // Scroll to bottom after messages are loaded
            setTimeout(() => scrollToBottom(), 100);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!data.content.trim()) return;
        
        try {
            // Just send the message, don't update state locally
            // The Echo broadcast will handle updating the UI
            await axios.post('/api/messages', data);
            reset('content');
            // No need to scroll here, the useEffect for messages will handle it
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            
            // Additional fallback to ensure scrolling works
            const messagesContainer = messagesEndRef.current.parentElement;
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
    };

    // Load messages when component mounts and set up Echo listener
    useEffect(() => {
        // Fetch messages immediately on mount
        fetchMessages();
        
        // Listen for new messages
        const channel = window.Echo.channel('shoutbox');
        
        // Set up connection status listeners
        channel.listen('.message.new', (event: { message: Message }) => {
            console.log('New message received:', event.message);
            // Check if message already exists to prevent duplicates
            setMessages(prevMessages => {
                // Check if this message ID already exists in our messages
                const messageExists = prevMessages.some(msg => msg.id === event.message.id);
                if (messageExists) {
                    // If it exists, don't add it again
                    return prevMessages;
                } else {
                    // If it's new, add it to the list
                    return [...prevMessages, event.message];
                }
            });
            scrollToBottom();
        });
        
        // Check connection status
        channel.subscribed(() => {
            console.log('Connected to shoutbox channel');
            setIsConnected(true);
        });
        
        channel.error(() => {
            console.error('Failed to connect to shoutbox channel');
            setIsConnected(false);
        });
        
        // Set up a ping to check connection status periodically
        const pingInterval = setInterval(() => {
            if (window.Echo && window.Echo.connector.socket.readyState === 1) {
                setIsConnected(true);
            } else {
                setIsConnected(false);
            }
        }, 5000);
        
        return () => {
            // Clean up the listener when component unmounts
            window.Echo.leave('shoutbox');
            clearInterval(pingInterval);
        };
    }, []); // Empty dependency array means this runs once on mount
    
    // Refresh messages when the shoutbox is opened
    useEffect(() => {
        if (isOpen) {
            fetchMessages();
            // scrollToBottom is called inside fetchMessages with a delay
        }
    }, [isOpen]);

    // Scroll to bottom whenever messages change
    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages]);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase();
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <Collapsible
                open={isOpen}
                onOpenChange={setIsOpen}
                className="w-80 md:w-96"
            >
                {/* No separate trigger button - we'll use the header as the trigger */}
                
                <div className="shadow-xl border rounded-xl bg-white dark:bg-neutral-800 dark:border-neutral-700">
                        <CollapsibleTrigger asChild>
                            <div className="py-3 px-4 bg-white/20 rounded-t-xl dark:bg-neutral-800 flex flex-row items-center justify-between space-y-0 cursor-pointer border-b dark:border-neutral-700">
                                <div className="w-full flex items-center space-x-2">
                                    <h3 className="text-md font-medium dark:text-white">Shoutbox</h3>
                                    <span className={`text-[11px] font-medium ${isConnected ? 'text-neutral-500 dark:text-neutral-300' : 'text-neutral-600 dark:text-neutral-400'} flex items-center bg-neutral-100 dark:bg-neutral-700 rounded-full px-1.5 py-1`}>
                                        <span className={`rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400'} block w-3 h-3`}></span>
                                        <span className="px-1">{isConnected ? 'Connected' : 'Not Connected'}</span>
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 cursor-pointer"
                                >
                                    {isOpen ? (
                                        <ChevronDown className="h-4 w-4" />
                                    ) : (
                                        <ChevronUp className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                            <div className="p-0">
                                <div className="h-80 overflow-y-auto p-4 space-y-4">
                                    {messages.length === 0 ? (
                                        <div className="flex items-center justify-center h-full text-neutral-500 dark:text-neutral-400">
                                            No messages yet. Start the conversation!
                                        </div>
                                    ) : (
                                        messages.map((message) => (
                                            <div key={message.id} className="flex gap-3">
                                                <Avatar>
                                                    <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(message.user.name)}&background=random`} />
                                                    <AvatarFallback>{getInitials(message.user.name)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="font-medium text-sm dark:text-white">{message.user.name}</span>
                                                        <span className="text-xs text-neutral-500 dark:text-neutral-400">{message.created_at}</span>
                                                    </div>
                                                    <p className="text-sm dark:text-neutral-300">{message.content}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>
                            
                            <div className="p-3 border-t dark:border-neutral-700">
                                <form onSubmit={sendMessage} className="flex w-full gap-2">
                                    <Input
                                        placeholder="Type a message..."
                                        value={data.content}
                                        onChange={(e) => setData('content', e.target.value)}
                                        disabled={processing}
                                        className="flex-1"
                                    />
                                    <Button 
                                        type="submit" 
                                        size="icon" 
                                        disabled={processing || !data.content.trim()}
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>
                            </div>
                        </CollapsibleContent>
                    </div>
            </Collapsible>
        </div>
    );
}
