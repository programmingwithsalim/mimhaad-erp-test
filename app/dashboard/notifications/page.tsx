"use client";
import { useNotifications } from "@/hooks/use-notifications";
import { Badge } from "@/components/ui/badge";

export default function NotificationsPage() {
  const { notifications, isLoading } = useNotifications();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      {isLoading ? (
        <div>Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="text-muted-foreground">No notifications found.</div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-md border p-4 shadow-sm ${
                notification.read ? "" : "bg-muted"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-lg">{notification.title}</div>
                <Badge variant="outline" className="text-xs">
                  {notification.type}
                </Badge>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {notification.message}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {new Date(notification.timestamp).toLocaleString()}
                {!notification.read && (
                  <span className="ml-2 text-primary">• Unread</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
