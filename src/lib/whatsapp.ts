/**
 * Helper utilities for formatting Ghanaian phone numbers, creating WhatsApp click-to-chat links,
 * and generating direct voice call links.
 */

export interface SellerPhones {
  whatsappPhone: string | null;
  callPhone: string | null;
  displayWhatsapp: string | null;
  displayCall: string | null;
}

export function parseSellerPhones(
  contactPhone?: string | null,
  profilePhone?: string | null,
  callPhoneColumn?: string | null
): SellerPhones {
  // If dedicated call_phone column is already present:
  if (callPhoneColumn && contactPhone) {
    return {
      whatsappPhone: contactPhone.trim(),
      callPhone: callPhoneColumn.trim(),
      displayWhatsapp: formatDisplayPhone(contactPhone),
      displayCall: formatDisplayPhone(callPhoneColumn),
    };
  }

  const raw = (contactPhone || profilePhone || "").trim();
  if (!raw) {
    return {
      whatsappPhone: null,
      callPhone: null,
      displayWhatsapp: null,
      displayCall: null,
    };
  }

  // If separated by '|', ',', or '/'
  // e.g. "0241234567 | 0209876543"
  const separators = ["|", ",", "/"];
  for (const sep of separators) {
    if (raw.includes(sep)) {
      const [wa, call] = raw.split(sep).map((s) => s.trim());
      const whatsapp = wa || null;
      const normalCall = call || wa || null;
      return {
        whatsappPhone: whatsapp,
        callPhone: normalCall,
        displayWhatsapp: formatDisplayPhone(whatsapp),
        displayCall: formatDisplayPhone(normalCall),
      };
    }
  }

  // Single number: works for BOTH WhatsApp and voice phone calls
  return {
    whatsappPhone: raw,
    callPhone: raw,
    displayWhatsapp: formatDisplayPhone(raw),
    displayCall: formatDisplayPhone(raw),
  };
}

export function formatWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;

  // Strip all non-digit characters
  let digits = phone.replace(/[^0-9]/g, "");
  if (!digits) return null;

  // Handle Ghanaian local number formats:
  // e.g. 0241234567 (10 digits starting with 0) -> 233241234567
  if (digits.startsWith("0") && digits.length === 10) {
    digits = "233" + digits.substring(1);
  }
  // e.g. 241234567 (9 digits without leading 0 or country code) -> 233241234567
  else if (digits.length === 9) {
    digits = "233" + digits;
  }
  // e.g. 00233... -> 233...
  else if (digits.startsWith("00233")) {
    digits = digits.substring(2);
  }

  // Ensure minimum valid length for WhatsApp
  if (digits.length < 9) return null;

  return digits;
}

export function createWhatsAppUrl(
  phone: string | null | undefined,
  message: string
): string | null {
  const formatted = formatWhatsAppNumber(phone);
  if (!formatted) return null;
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
}

export function createCallUrl(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // Clean phone number for tel: protocol (e.g. 0241234567 -> tel:0241234567)
  const cleaned = phone.replace(/[^0-9+]/g, "");
  if (!cleaned || cleaned.length < 9) return null;
  return `tel:${cleaned}`;
}

export function formatDisplayPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length === 10) {
    // Format 0241234567 -> 024 123 4567
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return phone;
}
