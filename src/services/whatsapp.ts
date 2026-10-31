import { normalizePhone, formatCurrency, formatDate } from './formatters';
import { Customer, Invoice, BusinessSettings } from '../types';

export const DEFAULT_TEMPLATES = {
  english: `Hello {{customer_name}}, greetings from {{business_name}}! We hope you are doing well. It may be time to replenish your agarbatti and pooja dhoop stock. Please let us know if you would like to place your next order. Thank you for your continued support!`,
  hindi: `नमस्ते {{customer_name}} जी, {{business_name}} की तरफ से सादर प्रणाम! आशा है आप सकुशल हैं। आपकी अगरबत्ती और धूप का स्टॉक समाप्त होने का समय हो गया होगा। कृपया नया आर्डर लिखवाने के लिए हमें बताएं। आपके सहयोग के लिए धन्यवाद!`,
  marathi: `नमस्कार {{customer_name}}जी, {{business_name}} तर्फे सस्नेह नमस्कार! आशा आहे आपण खुशाल आहात. आपल्याकडील अगरबत्ती आणि धूपचा साठा संपण्याची वेळ आली असावी. नवीन ऑर्डर नोंदवण्यासाठी कृपया आम्हाला कळवा. आपल्या सहकार्याबद्दल मनःपूर्वक धन्यवाद!`,
};

export function renderMessageTemplate(
  template: string,
  customer: Customer,
  settings: BusinessSettings
): string {
  let message = template;
  message = message.replace(/\{\{customer_name\}\}/g, customer.name || 'Valued Customer');
  message = message.replace(/\{\{business_name\}\}/g, settings.businessName || 'Welcome Agarbatti');
  message = message.replace(/\{\{business_phone\}\}/g, '7304357225');
  message = message.replace(
    /\{\{last_purchase_date\}\}/g,
    customer.lastPurchaseDate ? formatDate(customer.lastPurchaseDate) : 'recently'
  );
  message = message.replace(
    /\{\{last_amount\}\}/g,
    customer.lastPurchaseAmount ? formatCurrency(customer.lastPurchaseAmount) : ''
  );
  return message;
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const normalized = normalizePhone(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${normalized}?text=${encodedText}`;
}

const formatRupeeNumber = (num: number): string => {
  return Number(num || 0).toLocaleString('en-IN', {
    minimumFractionDigits: num % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });
};

/**
 * Formats bill details into the exact WhatsApp message requested by the owner:
 *
 * *Welcome Agarbatti* 🪔
 *
 * Thank you for visiting us, {{customer_name}}!
 *
 * Here are your purchase details:
 *
 * *Products:* 
 * {{product_names}}
 *
 * *Total Amount:* ₹{{total_amount}}
 *
 * *Amount Paid:* ₹{{amount_paid}}
 *
 * For more details, please contact us at *7304357225 , 9028779258*.
 *
 * Thank you for choosing Welcome Agarbatti! 🙏
 */
export function formatWhatsAppBillMessage(invoice: Invoice): string {
  // Format all product names, including quantity
  const productNames = invoice.items
    .map((item) => {
      const qtyStr = item.quantity ? ` (Qty: ${item.quantity})` : '';
      return `• ${item.name}${qtyStr}`;
    })
    .join('\n');

  const totalAmount = formatRupeeNumber(invoice.grandTotal);
  const amountPaid = formatRupeeNumber(invoice.amountReceived);
  return `*Welcome Agarbatti* 🪔

Thank you for visiting us, ${invoice.customerName}!

Here are your purchase details:

*Products:* 
${productNames}

*Total Amount:* ₹${totalAmount}

*Amount Paid:* ₹${amountPaid}

For more details, please contact us at *7304357225 , 9028779258*.

Thank you for choosing Welcome Agarbatti! 🙏`;
}

// Keep legacy detailed share helper for backward compatibility
export function formatInvoiceShareText(invoice: Invoice, settings?: BusinessSettings): string {
  return formatWhatsAppBillMessage(invoice);
}
