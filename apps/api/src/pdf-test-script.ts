import { PDFGeneratorService } from './common/services/pdf-generator.service';

async function run() {
  console.log('Starting PDF Test...');
  try {
    const service = new PDFGeneratorService();

    const mockData = {
      invoiceId: 'INV-12345678',
      clinic: {
        name: 'Test Clinic',
        address: '123 St',
        city: 'City',
        phone: '123',
        email: 'clinic@test.com',
      },
      patient: {
        name: 'John Doe',
        phoneNumber: '1234567890',
        address: '456 Av',
      },
      doctor: undefined, // Simulate missing doctor
      items: [
        {
          description: 'Item 1',
          quantity: 1,
          unitPrice: 100,
          amount: 100,
          hsnCode: '1234',
        },
        { description: 'Item 2', quantity: 2, unitPrice: 50, amount: 100 },
      ],
      subtotal: 200,
      total: 200,
      status: 'PAID',
    };

    const buffer = await service.generateInvoice(mockData);
    console.log('PDF Generated successfully, size:', buffer.length);
  } catch (e) {
    console.error('PDF Generation Failed:', e);
    if (e instanceof Error) {
      console.error(e.stack);
    }
  }
}

run();
