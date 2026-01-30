import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import AppHeader from "@/components/layout/AppHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, Plus, Target, MapPin, Trash2, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface FieldRecruiter {
  id: string;
  name: string;
  email: string | null;
}

interface Assignment {
  id: string;
  assignment_date: string;
  field_recruiter_id: string;
  manager_id: string;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  comments: string | null;
  target: number;
  created_at: string;
}

interface RecruiterTarget {
  id: string;
  field_recruiter_id: string;
  daily_target: number;
  effective_from: string;
  effective_to: string | null;
  created_by: string | null;
}

export default function FieldPlanning() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editingTarget, setEditingTarget] = useState<RecruiterTarget | null>(null);
  
  // Form states for assignment
  const [assignmentForm, setAssignmentForm] = useState({
    field_recruiter_id: "",
    location_name: "",
    latitude: "",
    longitude: "",
    comments: "",
    target: "0"
  });
  
  // Form states for target
  const [targetForm, setTargetForm] = useState({
    field_recruiter_id: "",
    daily_target: "0",
    effective_from: new Date(),
    effective_to: null as Date | null
  });

  // Fetch field recruiters
  const { data: fieldRecruiters = [] } = useQuery({
    queryKey: ["field-recruiters"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "field_recruiter");
      
      if (!roles || roles.length === 0) return [];
      
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);
      
      return (profiles || []) as FieldRecruiter[];
    }
  });

  // Fetch assignments for selected date
  const { data: assignments = [] } = useQuery({
    queryKey: ["field-assignments", format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("field_planning_assignments")
        .select("*")
        .eq("assignment_date", format(selectedDate, "yyyy-MM-dd"))
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Assignment[];
    }
  });

  // Fetch all targets
  const { data: targets = [] } = useQuery({
    queryKey: ["field-recruiter-targets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("field_recruiter_targets")
        .select("*")
        .order("effective_from", { ascending: false });
      
      if (error) throw error;
      return data as RecruiterTarget[];
    }
  });

  // Create/Update assignment mutation
  const assignmentMutation = useMutation({
    mutationFn: async (data: {
      id?: string;
      assignment_date: string;
      field_recruiter_id: string;
      manager_id: string;
      location_name: string;
      latitude: number | null;
      longitude: number | null;
      comments: string | null;
      target: number;
    }) => {
      if (data.id) {
        const { error } = await supabase
          .from("field_planning_assignments")
          .update({
            field_recruiter_id: data.field_recruiter_id,
            location_name: data.location_name,
            latitude: data.latitude,
            longitude: data.longitude,
            comments: data.comments,
            target: data.target
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("field_planning_assignments")
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-assignments"] });
      setIsAssignmentDialogOpen(false);
      setEditingAssignment(null);
      resetAssignmentForm();
      toast({ title: editingAssignment ? "Assignment updated" : "Assignment created" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("field_planning_assignments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-assignments"] });
      toast({ title: "Assignment deleted" });
    }
  });

  // Create/Update target mutation
  const targetMutation = useMutation({
    mutationFn: async (data: {
      id?: string;
      field_recruiter_id: string;
      daily_target: number;
      effective_from: string;
      effective_to: string | null;
      created_by: string | null;
    }) => {
      if (data.id) {
        const { error } = await supabase
          .from("field_recruiter_targets")
          .update({
            daily_target: data.daily_target,
            effective_from: data.effective_from,
            effective_to: data.effective_to
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("field_recruiter_targets")
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-recruiter-targets"] });
      setIsTargetDialogOpen(false);
      setEditingTarget(null);
      resetTargetForm();
      toast({ title: editingTarget ? "Target updated" : "Target created" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Delete target mutation
  const deleteTargetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("field_recruiter_targets")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-recruiter-targets"] });
      toast({ title: "Target deleted" });
    }
  });

  const resetAssignmentForm = () => {
    setAssignmentForm({
      field_recruiter_id: "",
      location_name: "",
      latitude: "",
      longitude: "",
      comments: "",
      target: "0"
    });
  };

  const resetTargetForm = () => {
    setTargetForm({
      field_recruiter_id: "",
      daily_target: "0",
      effective_from: new Date(),
      effective_to: null
    });
  };

  const handleSubmitAssignment = () => {
    if (!assignmentForm.field_recruiter_id || !assignmentForm.location_name) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    
    assignmentMutation.mutate({
      id: editingAssignment?.id,
      assignment_date: format(selectedDate, "yyyy-MM-dd"),
      field_recruiter_id: assignmentForm.field_recruiter_id,
      manager_id: user?.id || "",
      location_name: assignmentForm.location_name,
      latitude: assignmentForm.latitude ? parseFloat(assignmentForm.latitude) : null,
      longitude: assignmentForm.longitude ? parseFloat(assignmentForm.longitude) : null,
      comments: assignmentForm.comments || null,
      target: parseInt(assignmentForm.target) || 0
    });
  };

  const handleSubmitTarget = () => {
    if (!targetForm.field_recruiter_id) {
      toast({ title: "Please select a field recruiter", variant: "destructive" });
      return;
    }
    
    targetMutation.mutate({
      id: editingTarget?.id,
      field_recruiter_id: targetForm.field_recruiter_id,
      daily_target: parseInt(targetForm.daily_target) || 0,
      effective_from: format(targetForm.effective_from, "yyyy-MM-dd"),
      effective_to: targetForm.effective_to ? format(targetForm.effective_to, "yyyy-MM-dd") : null,
      created_by: user?.id || null
    });
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setAssignmentForm({
      field_recruiter_id: assignment.field_recruiter_id,
      location_name: assignment.location_name,
      latitude: assignment.latitude?.toString() || "",
      longitude: assignment.longitude?.toString() || "",
      comments: assignment.comments || "",
      target: assignment.target.toString()
    });
    setIsAssignmentDialogOpen(true);
  };

  const handleEditTarget = (target: RecruiterTarget) => {
    setEditingTarget(target);
    setTargetForm({
      field_recruiter_id: target.field_recruiter_id,
      daily_target: target.daily_target.toString(),
      effective_from: new Date(target.effective_from),
      effective_to: target.effective_to ? new Date(target.effective_to) : null
    });
    setIsTargetDialogOpen(true);
  };

  const getRecruiterName = (id: string) => {
    const recruiter = fieldRecruiters.find(fr => fr.id === id);
    return recruiter?.name || "Unknown";
  };

  return (
    <AppLayout>
      <AppHeader title="Field Planning" backPath="/" />
      <div className="p-4 pb-24 space-y-4">
        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location Calendar
            </TabsTrigger>
            <TabsTrigger value="targets" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Daily Targets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4 mt-4">
            {/* Date Picker */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Select Date</span>
                  <Dialog open={isAssignmentDialogOpen} onOpenChange={(open) => {
                    setIsAssignmentDialogOpen(open);
                    if (!open) {
                      setEditingAssignment(null);
                      resetAssignmentForm();
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Assignment
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {editingAssignment ? "Edit Assignment" : "New Assignment"}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Date</Label>
                          <Input value={format(selectedDate, "PPP")} disabled />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Field Recruiter *</Label>
                          <Select
                            value={assignmentForm.field_recruiter_id}
                            onValueChange={(v) => setAssignmentForm(prev => ({ ...prev, field_recruiter_id: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select recruiter" />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldRecruiters.map(fr => (
                                <SelectItem key={fr.id} value={fr.id}>{fr.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Manager</Label>
                          <Input value={profile?.name || "Current User"} disabled />
                        </div>

                        <div className="space-y-2">
                          <Label>Location Name *</Label>
                          <Input
                            value={assignmentForm.location_name}
                            onChange={(e) => setAssignmentForm(prev => ({ ...prev, location_name: e.target.value }))}
                            placeholder="Enter location name"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Latitude</Label>
                            <Input
                              type="number"
                              step="any"
                              value={assignmentForm.latitude}
                              onChange={(e) => setAssignmentForm(prev => ({ ...prev, latitude: e.target.value }))}
                              placeholder="e.g., 12.9716"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Longitude</Label>
                            <Input
                              type="number"
                              step="any"
                              value={assignmentForm.longitude}
                              onChange={(e) => setAssignmentForm(prev => ({ ...prev, longitude: e.target.value }))}
                              placeholder="e.g., 77.5946"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Daily Target</Label>
                          <Input
                            type="number"
                            value={assignmentForm.target}
                            onChange={(e) => setAssignmentForm(prev => ({ ...prev, target: e.target.value }))}
                            placeholder="0"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Comments</Label>
                          <Textarea
                            value={assignmentForm.comments}
                            onChange={(e) => setAssignmentForm(prev => ({ ...prev, comments: e.target.value }))}
                            placeholder="Any additional notes..."
                          />
                        </div>

                        <Button 
                          onClick={handleSubmitAssignment} 
                          className="w-full"
                          disabled={assignmentMutation.isPending}
                        >
                          {assignmentMutation.isPending ? "Saving..." : (editingAssignment ? "Update" : "Create")} Assignment
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>

            {/* Assignments Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Assignments for {format(selectedDate, "PPP")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assignments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No assignments for this date
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>FR Name</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignments.map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell className="font-medium">
                              {getRecruiterName(assignment.field_recruiter_id)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p>{assignment.location_name}</p>
                                {assignment.latitude && assignment.longitude && (
                                  <p className="text-xs text-muted-foreground">
                                    {assignment.latitude}, {assignment.longitude}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{assignment.target}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleEditAssignment(assignment)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
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
          </TabsContent>

          <TabsContent value="targets" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Daily Targets by Recruiter</span>
                  <Dialog open={isTargetDialogOpen} onOpenChange={(open) => {
                    setIsTargetDialogOpen(open);
                    if (!open) {
                      setEditingTarget(null);
                      resetTargetForm();
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Set Target
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          {editingTarget ? "Edit Target" : "Set Daily Target"}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Field Recruiter *</Label>
                          <Select
                            value={targetForm.field_recruiter_id}
                            onValueChange={(v) => setTargetForm(prev => ({ ...prev, field_recruiter_id: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select recruiter" />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldRecruiters.map(fr => (
                                <SelectItem key={fr.id} value={fr.id}>{fr.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Daily Target *</Label>
                          <Input
                            type="number"
                            value={targetForm.daily_target}
                            onChange={(e) => setTargetForm(prev => ({ ...prev, daily_target: e.target.value }))}
                            placeholder="Enter daily target"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Effective From</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(targetForm.effective_from, "PPP")}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={targetForm.effective_from}
                                onSelect={(date) => date && setTargetForm(prev => ({ ...prev, effective_from: date }))}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label>Effective To (Optional)</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {targetForm.effective_to ? format(targetForm.effective_to, "PPP") : "No end date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={targetForm.effective_to || undefined}
                                onSelect={(date) => setTargetForm(prev => ({ ...prev, effective_to: date || null }))}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <Button 
                          onClick={handleSubmitTarget} 
                          className="w-full"
                          disabled={targetMutation.isPending}
                        >
                          {targetMutation.isPending ? "Saving..." : (editingTarget ? "Update" : "Set")} Target
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {targets.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No targets set yet
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>FR Name</TableHead>
                          <TableHead>Daily Target</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead>To</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {targets.map((target) => (
                          <TableRow key={target.id}>
                            <TableCell className="font-medium">
                              {getRecruiterName(target.field_recruiter_id)}
                            </TableCell>
                            <TableCell>{target.daily_target}</TableCell>
                            <TableCell>
                              {format(new Date(target.effective_from), "dd MMM yyyy")}
                            </TableCell>
                            <TableCell>
                              {target.effective_to 
                                ? format(new Date(target.effective_to), "dd MMM yyyy")
                                : "Ongoing"
                              }
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleEditTarget(target)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => deleteTargetMutation.mutate(target.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
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
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
