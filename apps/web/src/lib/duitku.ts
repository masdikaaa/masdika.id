import crypto from 'crypto';

const DUITKU_MERCHANT_CODE = process.env.DUITKU_MERCHANT_CODE || '';
const DUITKU_API_KEY = process.env.DUITKU_API_KEY || '';
const DUITKU_ENV = process.env.DUITKU_ENV || 'sandbox';

const getBaseUrl = () => {
  return DUITKU_ENV === 'sandbox' 
    ? 'https://sandbox.duitku.com/webapi'
    : 'https://passport.duitku.com/webapi';
};

/**
 * Generate Signature for Create Transaction (Inquiry)
 * Format: MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
 */
export const generateInquirySignature = (merchantOrderId: string, paymentAmount: number) => {
  const str = `${DUITKU_MERCHANT_CODE}${merchantOrderId}${paymentAmount}${DUITKU_API_KEY}`;
  return crypto.createHash('md5').update(str).digest('hex');
};

/**
 * Generate Signature for Callback
 * Format: MD5(merchantCode + amount + merchantOrderId + apiKey)
 */
export const validateCallbackSignature = (amount: string | number, merchantOrderId: string, signature: string) => {
  const str = `${DUITKU_MERCHANT_CODE}${amount}${merchantOrderId}${DUITKU_API_KEY}`;
  const generated = crypto.createHash('md5').update(str).digest('hex');
  
  if (generated.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(generated), Buffer.from(signature));
};

/**
 * Generate Signature for Check Transaction
 * Format: MD5(merchantCode + merchantOrderId + apiKey)
 */
export const generateCheckSignature = (merchantOrderId: string) => {
  const str = `${DUITKU_MERCHANT_CODE}${merchantOrderId}${DUITKU_API_KEY}`;
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
  const url = `${getBaseUrl()}/api/merchant/v2/inquiry`;
  
  const payload = {
    merchantCode: DUITKU_MERCHANT_CODE,
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
  const url = `${getBaseUrl()}/api/merchant/transactionStatus`;
  
  const payload = {
    merchantCode: DUITKU_MERCHANT_CODE,
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
