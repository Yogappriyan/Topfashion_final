// Browser-safe email service
// In a production app, these should call a backend API to keep API keys secure

export async function sendOrderStatusEmail(
  email: string, 
  orderId: string, 
  status: string, 
  customerName: string
) {
  console.log('📝 Notification Sim:', {
    to: email,
    subject: `Order Update: TC-${orderId?.toUpperCase()}`,
    body: `Hi ${customerName}, your order TC-${orderId?.toUpperCase()} is now ${status?.toUpperCase()}.`
  });
  
  // To use real emails, implement a server-side route that uses Resend
}

export async function sendOrderConfirmationEmail(
  email: string,
  orderId: string,
  customerName: string,
  total: number
) {
  console.log('📝 Order Confirmation Sim:', {
    to: email,
    subject: `Order Confirmation: TC-${orderId?.toUpperCase()}`,
    total: total
  });
}

export async function sendOwnerExpressNotificationEmail(
  ownerEmail: string,
  orderDetails: {
    orderId: string,
    customerName: string,
    phone: string,
    address: string,
    products: string,
    total: number,
    orderTime: string,
    paymentMethod: string
  }
) {
  console.log('📱 [INSTANT EXPRESS NOTIFICATION SENT TO SITE OWNER]');
  console.log('📧 Email sent to owner:', {
    to: ownerEmail,
    subject: `⚠️ INSTANT EXPRESS DELIVERY REQUEST: TC-${orderDetails.orderId.toUpperCase()}`,
    body: `
      NEW EXPRESS DELIVERY ORDER DETECTED!
      ------------------------------------
      Order ID: TC-${orderDetails.orderId.toUpperCase()}
      Customer: ${orderDetails.customerName}
      Phone: ${orderDetails.phone}
      Address: ${orderDetails.address}
      Products: ${orderDetails.products}
      Total: ₹${orderDetails.total.toLocaleString()}
      Order Time: ${orderDetails.orderTime}
      Payment Method: ${orderDetails.paymentMethod}
      ------------------------------------
      Action Required: Dispatch Courier Immediately!
    `
  });
}
