import { useEffect, useRef, useState } from 'react';
import { useForm } from '@inertiajs/react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, X, Send, ChevronUp } from 'lucide-react';
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
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { data, setData, reset, processing } = useForm({
        content: '',
    });

    const fetchMessages = async () => {
        try {
            const response = await axios.get('/api/messages');
            setMessages(response.data);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!data.content.trim()) return;
        
        try {
            const response = await axios.post('/api/messages', data);
            setMessages([...messages, response.data]);
            reset('content');
            scrollToBottom();
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Load messages when component mounts and set up Echo listener
    useEffect(() => {
        // Fetch messages immediately on mount
        fetchMessages();
        
        // Listen for new messages
        const channel = window.Echo.channel('shoutbox');
        
        channel.listen('.message.new', (event: { message: Message }) => {
            console.log('New message received:', event.message);
            setMessages(prevMessages => [...prevMessages, event.message]);
            scrollToBottom();
        });
        
        return () => {
            // Clean up the listener when component unmounts
            window.Echo.leave('shoutbox');
        };
    }, []); // Empty dependency array means this runs once on mount
    
    // Refresh messages when the shoutbox is opened
    useEffect(() => {
        if (isOpen) {
            fetchMessages();
            scrollToBottom();
        }
    }, [isOpen]);

    useEffect(() => {
        scrollToBottom();
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
                <CollapsibleTrigger asChild>
                    <Button
                        variant={isOpen ? "outline" : "default"}
                        size="icon"
                        className={`rounded-full h-12 w-12 shadow-lg ${
                            isOpen ? 'hidden' : 'flex'
                        }`}
                    >
                        <MessageCircle className="h-6 w-6" />
                    </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent forceMount className="overflow-hidden">
                    <Card className="shadow-xl border rounded-xl">
                        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-md font-medium">Shoutbox</CardTitle>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        
                        <CardContent className="p-0">
                            <div className="h-80 overflow-y-auto p-4 space-y-4">
                                {messages.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-gray-500">
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
                                                    <span className="font-medium">{message.user.name}</span>
                                                    <span className="text-xs text-gray-500">{message.created_at}</span>
                                                </div>
                                                <p className="text-sm">{message.content}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </CardContent>
                        
                        <CardFooter className="p-3 border-t">
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
                        </CardFooter>
                    </Card>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}
