import { useState, useEffect, useMemo } from "react";
import { AppPageScaffold, Badge, Button, Card, CardContent, CardHeader, CardTitle, DataState, Input, PageHeader, PageTabs, Textarea } from "@workspace/ui/components";
import { Search, Send, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "../../../lib/formatters";
import { apiGet, apiPost } from "@/lib/api/api-client";

interface Thread { threadPhoneNumber: string; contactName?: string; lastMessageBody: string; lastMessageAt: string; unreadCount: number; lastMessageType: string; lastMessageDirection: string; }
interface Message { id: string; body: string; from: string; createdAt: string; direction: string; }

export function SupportPage() {
  const [activeTab, setActiveTab] = useState("whatsapp");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const data = await apiGet<Thread[]>("/api/internal/support/whatsapp/threads");
      setThreads(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const fetchMessages = async (phone: string) => {
    try {
      const data = await apiGet<Message[]>(`/api/internal/support/whatsapp/threads/${phone}/messages`);
      setMessages(data);
    } catch { /* ignore */ }
  };

  useEffect(() => { void fetchThreads(); }, []);

  useEffect(() => { if (selectedPhone) { void fetchMessages(selectedPhone); } }, [selectedPhone]);

  const filteredThreads = useMemo(() =>
    threads.filter((t) => !search || t.threadPhoneNumber.includes(search) || (t.contactName?.toLowerCase() || "").includes(search.toLowerCase())),
    [threads, search]);

  const currentThread = useMemo(() =>
    filteredThreads.find((t) => t.threadPhoneNumber === selectedPhone) ?? null,
    [filteredThreads, selectedPhone]);

  useEffect(() => { if (filteredThreads.length > 0 && !selectedPhone) { setSelectedPhone(filteredThreads[0]?.threadPhoneNumber ?? null); } }, [filteredThreads, selectedPhone]);

  const handleSendReply = () => {
    if (!selectedPhone || !replyMessage.trim()) return;
    void (async () => {
      await apiPost(`/api/internal/support/whatsapp/threads/${selectedPhone}/reply`, { message: replyMessage });
      setReplyMessage("");
      await fetchMessages(selectedPhone);
    })();
  };

  const tabItems = [
    { id: "whatsapp", label: "WhatsApp Inbox" },
    { id: "inquiries", label: "Inquiries" },
  ];

  return (
    <AppPageScaffold header={<PageHeader title="Support Hub" description="Manage WhatsApp conversations and user inquiries" />}>
      <PageTabs items={tabItems} activeId={activeTab} onSelect={(id) => { setActiveTab(id); }} ariaLabel="Support tabs" />

      {activeTab === "whatsapp" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr] mt-4">
          <Card>
            <CardHeader className="space-y-4 border-b bg-muted/20">
              <div className="flex items-start justify-between gap-3">
                <div><CardTitle>Threads</CardTitle>
                  <p className="text-sm text-muted-foreground">Select a conversation to review the full history.</p></div>
                <Badge variant="secondary" className="self-end">{threads.length} total</Badge>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => { setSearch(e.target.value); }} placeholder="Enter name, phone, or message" className="pl-10" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {filteredThreads.length === 0 ? (
                <div className="rounded-lg border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  No WhatsApp conversations found
                </div>
              ) : filteredThreads.map((thread) => (
                <Button key={thread.threadPhoneNumber} type="button" variant="ghost" onClick={() => { setSelectedPhone(thread.threadPhoneNumber); }}
                  className={`h-auto w-full justify-start gap-0 rounded-lg border p-4 text-left font-normal transition-colors hover:bg-muted/30 ${thread.threadPhoneNumber === selectedPhone ? "bg-muted/50 shadow-sm hover:bg-muted/50" : "bg-background"}`}>
                  <div className="flex w-full items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{thread.contactName || thread.threadPhoneNumber}</p>
                        {thread.unreadCount > 0 && <Badge>{String(thread.unreadCount)} new</Badge>}
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{thread.lastMessageBody}</p>
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground">{formatDistanceToNow(thread.lastMessageAt)}</div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            {currentThread ? (
              <>
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle>{currentThread.contactName || currentThread.threadPhoneNumber}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  <DataState status={loading ? "loading" : messages.length === 0 ? "empty" : "success"}
                    loadingMessage="Loading messages\u2026" emptyTitle="No messages yet"
                    emptyDescription="Messages will appear when the conversation starts." emptyIcon={MessageSquare}>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.direction === "INBOUND" ? "justify-start" : "justify-end"}`}>
                          <div className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.direction === "INBOUND" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                            <p className="text-sm">{msg.body}</p>
                            <p className="text-xs opacity-70 mt-1">{new Date(msg.createdAt).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DataState>
                  <div className="flex gap-2 pt-4 border-t">
                    <Textarea value={replyMessage} onChange={(e) => { setReplyMessage(e.target.value); }}
                      placeholder="Type your reply\u2026" rows={2} className="flex-1" />
                    <Button onClick={() => { handleSendReply(); }} disabled={!replyMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="p-8 text-center text-sm text-muted-foreground">No thread selected.</CardContent>
            )}
          </Card>
        </div>
      ) : (
        <Card className="mt-4"><CardHeader><CardTitle>Support Inquiries</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">No inquiries yet.</p></CardContent>
        </Card>
      )}
    </AppPageScaffold>
  );
}
