"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "transaction" | "system" | "security";
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      } else {
        console.error("Failed to fetch notifications");
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        setUpdating(notificationId);
        const response = await fetch(`/api/notifications/${notificationId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "mark-read" }),
        });

        if (response.ok) {
          setNotifications((prev) =>
            prev.map((notification) =>
              notification.id === notificationId
                ? {
                    ...notification,
                    is_read: true,
                    read_at: new Date().toISOString(),
                  }
                : notification
            )
          );
          toast({
            title: "Success",
            description: "Notification marked as read",
          });
          return true;
        } else {
          throw new Error("Failed to mark notification as read");
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to mark notification as read",
          variant: "destructive",
        });
        return false;
      } finally {
        setUpdating(null);
      }
    },
    [toast]
  );

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        setUpdating(notificationId);
        const response = await fetch(`/api/notifications/${notificationId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setNotifications((prev) =>
            prev.filter((notification) => notification.id !== notificationId)
          );
          toast({
            title: "Success",
            description: "Notification deleted",
          });
          return true;
        } else {
          throw new Error("Failed to delete notification");
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete notification",
          variant: "destructive",
        });
        return false;
      } finally {
        setUpdating(null);
      }
    },
    [toast]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      setUpdating("all");
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications((prev) =>
          prev.map((notification) => ({
            ...notification,
            is_read: true,
            read_at: new Date().toISOString(),
          }))
        );
        toast({
          title: "Success",
          description: data.message,
        });
        return true;
      } else {
        throw new Error("Failed to mark all notifications as read");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
      return false;
    } finally {
      setUpdating(null);
    }
  }, [toast]);

  const deleteAllNotifications = useCallback(async () => {
    try {
      setUpdating("delete-all");
      const response = await fetch("/api/notifications/delete-all", {
        method: "DELETE",
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications([]);
        toast({
          title: "Success",
          description: data.message,
        });
        return true;
      } else {
        throw new Error("Failed to delete all notifications");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete all notifications",
        variant: "destructive",
      });
      return false;
    } finally {
      setUpdating(null);
    }
  }, [toast]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    loading,
    updating,
    unreadCount,
    fetchNotifications,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    deleteAllNotifications,
  };
}
