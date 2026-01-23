import { useState } from "react";
import { Plus, Library } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import CreateLeadDialog from "@/components/leads/CreateLeadDialog";

const LeadForms = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="pb-24 safe-area-top">
        <AppHeader title="Lead Forms" subtitle="Create and manage leads" />

        <div className="mx-4 mt-6 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="w-full h-20 text-lg gap-3"
              size="lg"
            >
              <Plus className="w-6 h-6" />
              Create Leads
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={() => navigate("/leads-library")}
              variant="outline"
              className="w-full h-20 text-lg gap-3"
              size="lg"
            >
              <Library className="w-6 h-6" />
              View Leads Library
            </Button>
          </motion.div>
        </div>

        <CreateLeadDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </div>
    </AppLayout>
  );
};

export default LeadForms;
