// Template Manager - Handles expense template data model and storage
// Based on manual expense payload structure from manual_post.js

const TEMPLATE_STORAGE_KEY = 'expenseTemplates';
const TEMPLATE_VERSION = 1;
const MAX_TEMPLATE_SIZE = 8192; // 8KB per template
const MAX_TEMPLATE_NAME_LENGTH = 50;
const MAX_TEMPLATE_DESCRIPTION_LENGTH = 200;

// Valid frequency options for recurring expenses
const VALID_FREQUENCIES = ['monthly', 'weekly', 'quarterly', 'yearly', 'custom'];

// Template schema based on manual expense payload
const TEMPLATE_SCHEMA = {
  id: 'string',                    // UUID for template identification
  name: 'string',                  // User-friendly template name (max 50 chars)
  description: 'string',           // Template description (max 200 chars)
  frequency: 'string',             // "monthly", "weekly", "quarterly", "yearly", "custom"
  createdAt: 'string',            // ISO 8601 timestamp
  updatedAt: 'string',            // ISO 8601 timestamp
  version: 'number',              // Schema version for migration support
  expenseData: {
    merchant: {
      name: 'string',             // Required: merchant name
      logo: 'string',             // Optional: merchant logo URL
      category: 'string',         // Required: expense category
      online: 'boolean',          // Default: false
      perDiem: 'boolean',         // Default: false
      timeZone: 'string',         // Default: "Z"
      formattedAddress: 'string', // Optional: merchant address
      categoryGroup: 'string',    // Required: category group
      description: 'string'       // Optional: merchant description
    },
    merchantAmount: 'number',     // Required: positive number
    merchantCurrency: 'string',   // Required: ISO currency code
    policy: 'string',            // Required: expense policy
    details: {
      participants: 'array',      // Current user participant data
      description: 'string',      // Optional: expense description
      customFieldValues: 'array', // Optional: custom field data
      taxDetails: 'object',       // Tax information structure
      personal: 'boolean',        // Default: false
      personalMerchantAmount: 'number' // Optional: personal portion
    },
    reportingData: {
      department: 'string',       // Optional: department code
      billTo: 'string',          // Optional: billing information
      subsidiary: 'string',      // Optional: subsidiary code
      region: 'string'           // Optional: region code
    }
  }
};

// Template validation rules
const VALIDATION_RULES = {
  required: ['name', 'expenseData.merchant.name', 'expenseData.merchantAmount', 'expenseData.merchantCurrency', 'expenseData.policy'],
  uniqueFields: ['name'],
  positiveNumbers: ['expenseData.merchantAmount'],
  maxLengths: {
    name: MAX_TEMPLATE_NAME_LENGTH,
    description: MAX_TEMPLATE_DESCRIPTION_LENGTH
  },
  validValues: {
    frequency: VALID_FREQUENCIES
  }
};

// Template utility functions
class TemplateManager {
  
  // Generate unique template ID
  static generateTemplateId() {
    return 'template-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
  
  // Create new template from expense data
  static createTemplate(name, description, frequency, expenseData) {
    const template = {
      id: this.generateTemplateId(),
      name: name.trim(),
      description: description.trim(),
      frequency: frequency,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: TEMPLATE_VERSION,
      expenseData: this.sanitizeExpenseData(expenseData)
    };
    
    return template;
  }
  
  // Sanitize expense data to remove dynamic fields
  static sanitizeExpenseData(expenseData) {
    const sanitized = {
      merchant: {
        name: expenseData.merchant?.name || '',
        logo: expenseData.merchant?.logo || '',
        category: expenseData.merchant?.category || '',
        online: expenseData.merchant?.online || false,
        perDiem: expenseData.merchant?.perDiem || false,
        timeZone: expenseData.merchant?.timeZone || 'Z',
        formattedAddress: expenseData.merchant?.formattedAddress || '',
        categoryGroup: expenseData.merchant?.categoryGroup || '',
        description: expenseData.merchant?.description || ''
      },
      merchantAmount: expenseData.merchantAmount || 0,
      merchantCurrency: expenseData.merchantCurrency || 'USD',
      policy: expenseData.policy || '',
      details: {
        participants: expenseData.details?.participants || [],
        description: expenseData.details?.description || '',
        customFieldValues: expenseData.details?.customFieldValues || [],
        taxDetails: expenseData.details?.taxDetails || {},
        personal: expenseData.details?.personal || false,
        personalMerchantAmount: expenseData.details?.personalMerchantAmount || null
      },
      reportingData: {
        department: expenseData.reportingData?.department || null,
        billTo: expenseData.reportingData?.billTo || null,
        subsidiary: expenseData.reportingData?.subsidiary || null,
        region: expenseData.reportingData?.region || null
      }
    };
    
    return sanitized;
  }
  
  // Validate template data
  static validateTemplate(template) {
    const errors = [];
    
    // Check required fields
    for (const field of VALIDATION_RULES.required) {
      if (!this.getNestedValue(template, field)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Check string length limits
    for (const [field, maxLength] of Object.entries(VALIDATION_RULES.maxLengths)) {
      const value = template[field];
      if (value && typeof value === 'string' && value.length > maxLength) {
        errors.push(`Field ${field} exceeds maximum length of ${maxLength}`);
      }
    }
    
    // Check valid values
    for (const [field, validValues] of Object.entries(VALIDATION_RULES.validValues)) {
      const value = template[field];
      if (value && !validValues.includes(value)) {
        errors.push(`Invalid value for ${field}: ${value}. Valid values: ${validValues.join(', ')}`);
      }
    }
    
    // Check positive numbers
    for (const field of VALIDATION_RULES.positiveNumbers) {
      const value = this.getNestedValue(template, field);
      if (value !== undefined && (typeof value !== 'number' || value <= 0)) {
        errors.push(`Field ${field} must be a positive number`);
      }
    }
    
    // Check template size
    const templateSize = JSON.stringify(template).length;
    if (templateSize > MAX_TEMPLATE_SIZE) {
      errors.push(`Template size (${templateSize} bytes) exceeds maximum limit of ${MAX_TEMPLATE_SIZE} bytes`);
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  // Helper function to get nested object values
  static getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }
  
  // Check if template name is unique
  static async isTemplateNameUnique(name, excludeId = null) {
    try {
      const templates = await this.getAllTemplates();
      return !templates.some(template => 
        template.name.toLowerCase() === name.toLowerCase() && 
        template.id !== excludeId
      );
    } catch (error) {
      console.error('Error checking template name uniqueness:', error);
      return false;
    }
  }
  
  // Get all templates from storage
  static async getAllTemplates() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(TEMPLATE_STORAGE_KEY, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          const templates = result[TEMPLATE_STORAGE_KEY] || {};
          resolve(Object.values(templates));
        }
      });
    });
  }
  
  // Save template to storage
  static async saveTemplate(template) {
    try {
      // Validate template before saving
      const validation = this.validateTemplate(template);
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Check name uniqueness
      const isUnique = await this.isTemplateNameUnique(template.name);
      if (!isUnique) {
        throw new Error(`Template name "${template.name}" already exists`);
      }
      
      // Get existing templates
      const existingTemplates = await this.getAllTemplatesObject();
      
      // Check storage quota
      const currentSize = JSON.stringify(existingTemplates).length;
      const templateSize = JSON.stringify(template).length;
      const maxQuota = 5 * 1024 * 1024; // 5MB
      
      if (currentSize + templateSize > maxQuota) {
        throw new Error('Storage quota exceeded. Please delete some templates.');
      }
      
      // Add template to storage
      existingTemplates[template.id] = template;
      
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [TEMPLATE_STORAGE_KEY]: existingTemplates }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve({ success: true, templateId: template.id });
          }
        });
      });
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  }
  
  // Update existing template
  static async updateTemplate(templateId, templateData) {
    try {
      // Get existing templates
      const existingTemplates = await this.getAllTemplatesObject();
      
      // Check if template exists
      if (!existingTemplates[templateId]) {
        throw new Error(`Template with ID "${templateId}" not found`);
      }
      
      // Preserve creation timestamp, update modification timestamp
      const updatedTemplate = {
        ...templateData,
        id: templateId,
        createdAt: existingTemplates[templateId].createdAt,
        updatedAt: new Date().toISOString()
      };
      
      // Validate updated template
      const validation = this.validateTemplate(updatedTemplate);
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Check name uniqueness (excluding current template)
      const isUnique = await this.isTemplateNameUnique(updatedTemplate.name, templateId);
      if (!isUnique) {
        throw new Error(`Template name "${updatedTemplate.name}" already exists`);
      }
      
      // Update template in storage
      existingTemplates[templateId] = updatedTemplate;
      
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [TEMPLATE_STORAGE_KEY]: existingTemplates }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve({ success: true, templateId: templateId });
          }
        });
      });
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }
  
  // Delete template from storage
  static async deleteTemplate(templateId) {
    try {
      // Get existing templates
      const existingTemplates = await this.getAllTemplatesObject();
      
      // Check if template exists
      if (!existingTemplates[templateId]) {
        throw new Error(`Template with ID "${templateId}" not found`);
      }
      
      // Remove template from storage
      delete existingTemplates[templateId];
      
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [TEMPLATE_STORAGE_KEY]: existingTemplates }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve({ success: true, templateId: templateId });
          }
        });
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }
  
  // Get single template by ID
  static async getTemplate(templateId) {
    try {
      const templates = await this.getAllTemplatesObject();
      const template = templates[templateId];
      
      if (!template) {
        throw new Error(`Template with ID "${templateId}" not found`);
      }
      
      return template;
    } catch (error) {
      console.error('Error getting template:', error);
      throw error;
    }
  }
  
  // Get all templates as object (for internal use)
  static async getAllTemplatesObject() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(TEMPLATE_STORAGE_KEY, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result[TEMPLATE_STORAGE_KEY] || {});
        }
      });
    });
  }
  
  // Clear all templates (for testing/admin)
  static async clearAllTemplates() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(TEMPLATE_STORAGE_KEY, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve({ success: true });
        }
      });
    });
  }
  
  // Export templates to JSON
  static async exportTemplates() {
    try {
      const templates = await this.getAllTemplates();
      const exportData = {
        version: TEMPLATE_VERSION,
        exportDate: new Date().toISOString(),
        templates: templates
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting templates:', error);
      throw error;
    }
  }
  
  // Import templates from JSON
  static async importTemplates(jsonData, options = { overwrite: false }) {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.templates || !Array.isArray(importData.templates)) {
        throw new Error('Invalid template data format');
      }
      
      const existingTemplates = await this.getAllTemplatesObject();
      const importResults = { success: 0, failed: 0, skipped: 0, errors: [] };
      
      for (const template of importData.templates) {
        try {
          // Check if template already exists
          if (existingTemplates[template.id] && !options.overwrite) {
            importResults.skipped++;
            continue;
          }
          
          // Validate template
          const validation = this.validateTemplate(template);
          if (!validation.isValid) {
            importResults.failed++;
            importResults.errors.push(`Template "${template.name}": ${validation.errors.join(', ')}`);
            continue;
          }
          
          // Add to storage
          existingTemplates[template.id] = template;
          importResults.success++;
        } catch (error) {
          importResults.failed++;
          importResults.errors.push(`Template "${template.name}": ${error.message}`);
        }
      }
      
      // Save updated templates
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ [TEMPLATE_STORAGE_KEY]: existingTemplates }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
      
      return importResults;
    } catch (error) {
      console.error('Error importing templates:', error);
      throw error;
    }
  }

  // Convert template to expense payload for API
  static templateToExpensePayload(template, overrides = {}) {
    const payload = {
      date: overrides.date || new Date().toISOString(),
      merchant: { ...template.expenseData.merchant },
      merchantAmount: overrides.merchantAmount || template.expenseData.merchantAmount,
      merchantCurrency: template.expenseData.merchantCurrency,
      policy: template.expenseData.policy,
      details: {
        ...template.expenseData.details,
        description: overrides.description || template.expenseData.details.description
      },
      reportingData: { ...template.expenseData.reportingData }
    };
    
    return payload;
  }
  
  // Calculate storage usage
  static async getStorageUsage() {
    try {
      const templates = await this.getAllTemplates();
      const totalSize = JSON.stringify(templates).length;
      const templateCount = templates.length;
      
      return {
        templateCount,
        totalSize,
        averageSize: templateCount > 0 ? Math.round(totalSize / templateCount) : 0,
        percentageUsed: Math.round((totalSize / (1024 * 1024 * 5)) * 100) // 5MB quota
      };
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      return { templateCount: 0, totalSize: 0, averageSize: 0, percentageUsed: 0 };
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TemplateManager;
}