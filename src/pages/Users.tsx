import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Trash2, ArrowLeft, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserWithRole {
  id: string;
  name: string;
  email: string | null;
  status: string;
  created_at: string;
  role: "admin" | "ops_manager" | "field_recruiter";
}

const Users = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { isAdmin, isManager } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email, status, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for all users
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || "field_recruiter",
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetUserId) return;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-user-password", {
        body: { userId: resetUserId },
      });

      if (error) throw error;

      setTempPassword(data.tempPassword);
      
      // Update the temp_password_expires_at in profiles
      await supabase
        .from("profiles")
        .update({ temp_password_expires_at: data.expiresAt })
        .eq("id", resetUserId);

      toast({
        title: "Password Reset",
        description: "Temporary password generated. Share it with the user.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
      setResetUserId(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke("delete-user", {
        body: { userId: deleteUserId },
      });

      if (error) throw error;

      setUsers(users.filter((u) => u.id !== deleteUserId));
      toast({
        title: "User Deleted",
        description: "The user has been removed from the system.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setDeleteUserId(null);
    }
  };

  const copyToClipboard = async () => {
    if (tempPassword) {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      admin: "default",
      ops_manager: "secondary",
      field_recruiter: "outline",
    };
    const labels: Record<string, string> = {
      admin: "Admin",
      ops_manager: "Ops Manager",
      field_recruiter: "Field Recruiter",
    };
    return (
      <Badge variant={variants[role] || "outline"}>
        {labels[role] || role}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge
        variant={status === "active" ? "default" : "secondary"}
        className={status === "active" ? "bg-success text-success-foreground" : ""}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!isManager) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              You don't have permission to view this page.
            </p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border p-4 safe-area-top">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Users</h1>
            <p className="text-sm text-muted-foreground">
              Manage registered users
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Users</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No users found
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Account Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created On</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email || "-"}
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(user.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setResetUserId(user.id)}
                              title="Reset Password"
                            >
                              <KeyRound className="h-4 w-4 text-warning" />
                            </Button>
                            {isAdmin && user.role !== "admin" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteUserId(user.id)}
                                title="Delete User"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reset Password Confirmation */}
      <AlertDialog open={!!resetUserId && !tempPassword} onOpenChange={() => setResetUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a temporary password valid for 2 hours. The user
              must log in with this password and change it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword} disabled={actionLoading}>
              {actionLoading ? "Generating..." : "Generate Password"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Temp Password Display */}
      <Dialog open={!!tempPassword} onOpenChange={() => { setTempPassword(null); setResetUserId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary Password</DialogTitle>
            <DialogDescription>
              Share this password with the user. It expires in 2 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
            <code className="flex-1 text-lg font-mono">{tempPassword}</code>
            <Button variant="ghost" size="icon" onClick={copyToClipboard}>
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Click the copy icon to copy the password
          </p>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Users;
