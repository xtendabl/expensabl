const TemplateManager = require('./template-manager.js');

// Mock chrome environment
global.chrome = {
  storage: {
    local: {
      data: {},
      get: function(key, callback) {
        callback({ [key]: this.data[key] });
      },
      set: function(obj, callback) {
        Object.assign(this.data, obj);
        if (callback) callback();
      }
    }
  }
};

async function testTemplateToExpenseConversion() {
  console.log('🔄 Testing Template-to-Expense Conversion...');
  
  // Create a sample template
  const sampleExpenseData = {
    merchant: { name: 'AT&T', category: 'utilities', categoryGroup: 'OTHER' },
    merchantAmount: 89.99,
    merchantCurrency: 'USD',
    policy: 'TELECOM',
    details: {
      participants: [{
        uuid: 'user-123',
        email: 'user@example.com',
        givenName: 'John',
        familyName: 'Doe',
        fullName: 'John Doe'
      }],
      description: 'Monthly phone bill',
      personal: false
    },
    reportingData: { department: 'Engineering' }
  };
  
  const template = TemplateManager.createTemplate(
    'Monthly Phone Bill',
    'AT&T monthly service',
    'monthly',
    sampleExpenseData
  );
  
  // Convert template to expense payload
  const expensePayload = TemplateManager.templateToExpensePayload(template, {
    date: '2025-01-15T10:30:00.000Z'
  });
  
  console.log('Template created:', template.name);
  console.log('Expense payload generated with amount:', expensePayload.merchantAmount);
  console.log('Merchant:', expensePayload.merchant.name);
  console.log('Policy:', expensePayload.policy);
  console.log('Date:', expensePayload.date);
  
  // Validate conversion
  if (expensePayload.merchantAmount !== template.expenseData.merchantAmount) {
    throw new Error('Amount conversion failed');
  }
  
  if (expensePayload.merchant.name !== template.expenseData.merchant.name) {
    throw new Error('Merchant conversion failed');
  }
  
  if (expensePayload.policy !== template.expenseData.policy) {
    throw new Error('Policy conversion failed');
  }
  
  if (!expensePayload.date) {
    throw new Error('Date not set in conversion');
  }
  
  console.log('✅ Template-to-expense conversion successful!');
  return true;
}

testTemplateToExpenseConversion().catch(console.error);