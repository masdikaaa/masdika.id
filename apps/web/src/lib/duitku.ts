import crypto from 'crypto';

const getDuitkuConfig = () => {
  const merchantCode = (process.env.DUITKU_MERCHANT_CODE || '').trim();
  const apiKey = (process.env.DUITKU_API_KEY || '').trim();
  const env = (process.env.DUITKU_ENV || 'sandbox').trim();
  return { merchantCode, apiKey, env };
};

const getBaseUrl = () => {
  const { env } = getDuitkuConfig();
  return env === 'sandbox' 
    ? 'https://sandbox.duitku.com/webapi'
    : 'https://passport.duitku.com/webapi';
};

/**
 * Generate Signature for Create Transaction (Inquiry)
 * Format: MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
 */
export const generateInquirySignature = (merchantOrderId: string, paymentAmount: number) => {
  const { merchantCode, apiKey } = getDuitkuConfig();
  if (!merchantCode || !apiKey) {
    throw new Error('[SECURITY] DUITKU_MERCHANT_CODE and DUITKU_API_KEY must be configured');
  }
  const str = `${merchantCode}${merchantOrderId}${paymentAmount}${apiKey}`;
  return crypto.createHash('md5').update(str).digest('hex');
};

/**
 * Generate Signature for Callback
 * Format: MD5(merchantCode + amount + merchantOrderId + apiKey)
 */
export const validateCallbackSignature = (amount: string | number, merchantOrderId: string, signature: string) => {
  const { merchantCode, apiKey } = getDuitkuConfig();
  if (!merchantCode || !apiKey) {
    return false;
  }
  if (!signature || typeof signature !== 'string' || !merchantOrderId || typeof merchantOrderId !== 'string') {
    return false;
  }
  const normalizedSig = signature.trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(normalizedSig)) {
    return false;
  }

  const str = `${merchantCode}${amount}${merchantOrderId}${apiKey}`;
  const generated = crypto.createHash('md5').update(str).digest('hex').toLowerCase();

  const genBuf = Buffer.from(generated, 'utf8');
  const sigBuf = Buffer.from(normalizedSig, 'utf8');
  if (genBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(genBuf, sigBuf);
};

/**
 * Generate Signature for Check Transaction
 * Format: MD5(merchantCode + merchantOrderId + apiKey)
 */
export const generateCheckSignature = (merchantOrderId: string) => {
  const { merchantCode, apiKey } = getDuitkuConfig();
  if (!merchantCode || !apiKey) {
    throw new Error('[SECURITY] DUITKU_MERCHANT_CODE and DUITKU_API_KEY must be configured');
  }
  const str = `${merchantCode}${merchantOrderId}${apiKey}`;
  return crypto.createHash('md5').update(str).digest('hex');
};

export interface DuitkuItemDetails {
  name: string;
  price: number;
  quantity: number;
}

export interface CreateTransactionParams {
  paymentAmount: number;
  merchantOrderId: string;
  productDetails: string;
  email: string;
  phoneNumber: string;
  additionalParam?: string;
  merchantUserInfo?: string;
  customerVaName: string;
  callbackUrl: string;
  returnUrl: string;
  expiryPeriod?: number; // In minutes
  paymentMethod: string; // e.g. "BC", "VC", "M2"
  itemDetails: DuitkuItemDetails[];
}

export const createDuitkuTransaction = async (params: CreateTransactionParams) => {
  const { merchantCode } = getDuitkuConfig();
  if (!merchantCode) {
    throw new Error('[SECURITY] DUITKU_MERCHANT_CODE is not configured');
  }
  const url = `${getBaseUrl()}/api/merchant/v2/inquiry`;
  
  const payload = {
    merchantCode,
    paymentAmount: params.paymentAmount,
    paymentMethod: params.paymentMethod,
    merchantOrderId: params.merchantOrderId,
    productDetails: params.productDetails,
    additionalParam: params.additionalParam || '',
    merchantUserInfo: params.merchantUserInfo || '',
    customerVaName: params.customerVaName,
    email: params.email,
    phoneNumber: params.phoneNumber,
    itemDetails: params.itemDetails,
    customerDetail: {
      firstName: params.customerVaName.split(' ')[0],
      lastName: params.customerVaName.split(' ').slice(1).join(' ') || '',
      email: params.email,
      phoneNumber: params.phoneNumber,
    },
    callbackUrl: params.callbackUrl,
    returnUrl: params.returnUrl,
    signature: generateInquirySignature(params.merchantOrderId, params.paymentAmount),
    expiryPeriod: params.expiryPeriod || 60, // 60 minutes default
  };

  const https = require('https');
  const payloadString = JSON.stringify(payload);
  const data = await new Promise<any>((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(payloadString)
      }
    }, (res: any) => {
      let body = '';
      res.on('data', (chunk: any) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.statusCode !== '00') {
            console.error('Duitku API Error Data:', parsed);
            return reject(new Error(parsed.statusMessage || 'Failed to create transaction'));
          }
          resolve(parsed);
        } catch (e) {
          console.error('Duitku API Error parsing:', body);
          reject(new Error(`Failed to parse Duitku response: ${res.statusCode} ${res.statusMessage}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payloadString);
    req.end();
  });

  return data;
};

export const checkDuitkuTransaction = async (merchantOrderId: string) => {
  const { merchantCode } = getDuitkuConfig();
  if (!merchantCode) {
    throw new Error('[SECURITY] DUITKU_MERCHANT_CODE is not configured');
  }
  const url = `${getBaseUrl()}/api/merchant/transactionStatus`;
  
  const payload = {
    merchantCode,
    merchantOrderId,
    signature: generateCheckSignature(merchantOrderId),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return response.json();
};
