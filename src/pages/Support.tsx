import { motion } from "framer-motion";
import { Phone, MessageCircle, Mail } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import AppHeader from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";

const Support = () => {
  const handleCall = () => {
    window.location.href = "tel:+919940812462";
  };

  const handleWhatsApp = () => {
    window.open("https://wa.me/919940812462", "_blank");
  };

  const handleEmail = () => {
    window.location.href = "mailto:support@company.com";
  };

  return (
    <AppLayout>
      <AppHeader title="Contact Support" subtitle="We're here to help" />
      
      <div className="px-4 py-6 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-card rounded-xl shadow-card text-center"
        >
          <h2 className="text-lg font-semibold text-foreground mb-2">Need Help?</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Our support team is available to assist you with any questions or issues.
          </p>

          <div className="space-y-3">
            <Button
              onClick={handleCall}
              className="w-full flex items-center justify-center gap-3"
              variant="default"
            >
              <Phone className="w-5 h-5" />
              Call Support
            </Button>

            <Button
              onClick={handleWhatsApp}
              className="w-full flex items-center justify-center gap-3 bg-success hover:bg-success/90"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp Support
            </Button>

            <Button
              onClick={handleEmail}
              variant="outline"
              className="w-full flex items-center justify-center gap-3"
            >
              <Mail className="w-5 h-5" />
              Email Support
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 bg-card rounded-xl shadow-card"
        >
          <h3 className="text-sm font-semibold text-foreground mb-2">Support Hours</h3>
          <p className="text-xs text-muted-foreground">
            Monday - Saturday: 9:00 AM - 6:00 PM
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Support;
