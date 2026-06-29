// Generates a WhatsApp click-to-chat link for admin notification.
// For automated messages, replace with WhatsApp Business API.
exports.sendWhatsAppNotification = async (clientName, packageName, travelDate, numTravelers) => {
  const phone = process.env.WHATSAPP_PHONE?.replace(/\D/g, '');
  if (!phone) return;
  const msg = encodeURIComponent(
    `🧳 New Booking!\nClient: ${clientName}\nPackage: ${packageName}\nDate: ${travelDate}\nTravelers: ${numTravelers}`
  );
  // In a server context we log the link; in a real deployment you'd trigger
  // a WhatsApp Business API call or store for admin to open.
  console.log(`[WhatsApp] https://wa.me/${phone}?text=${msg}`);
};
