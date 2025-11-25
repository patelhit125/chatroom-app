"use client";

import Link from "next/link";
import { ArrowLeft, Mail, MapPin, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-4xl">
        <Link href="/">
          <Button
            variant="ghost"
            className="mb-8 -ml-4 text-gray-600 hover:text-black"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Get in Touch
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Have a question or feedback? We'd love to hear from you.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold mb-6">
                  Contact Information
                </h2>
                <p className="text-gray-600 leading-relaxed mb-8">
                  You can reach us through the following channels. We typically
                  respond within 24-48 hours.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Email</h3>
                    <a
                      href="mailto:support@easypepayment.com"
                      className="text-gray-600 hover:text-black transition-colors"
                    >
                      support@easypepayment.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Building className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Office Address</h3>
                    <div className="text-gray-600 space-y-1">
                      <p className="font-medium">
                        EASYPE PAYMENT SOLUTIONS PRIVATE LIMITED
                      </p>
                      <p>Building No./Flat No.: NO.48</p>
                      <p>Road/Street: Vallalpari Street</p>
                      <p>Locality/Sub Locality: MGR Nagar</p>
                      <p>City/Town/Village: Chennai</p>
                      <p>District: Chennai</p>
                      <p>State: Tamil Nadu</p>
                      <p>PIN Code: 600078</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-200">
                <h3 className="font-semibold mb-4">Other Resources</h3>
                <div className="space-y-2">
                  <Link
                    href="/terms"
                    className="block text-gray-600 hover:text-black transition-colors"
                  >
                    Terms & Conditions
                  </Link>
                  <Link
                    href="/privacy"
                    className="block text-gray-600 hover:text-black transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
