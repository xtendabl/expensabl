---
id: doc-001
title: Cloudflare Security Block Handling - Technical Specification
created_date: '2025-08-06'
---

# Cloudflare Security Block Handling - Technical Specification

## Executive Summary

This document outlines technical approaches for detecting and handling Cloudflare security blocks in the Expensabl Chrome extension's receipt upload functionality. Based on extensive research, we present multiple implementation strategies with their trade-offs, and recommend a hybrid approach that balances reliability, user experience, and maintainability.

## Problem Statement

When uploading receipts to Navan's API, certain file types and content patterns trigger Cloudflare's Web Application Firewall (WAF), resulting in 403 Forbidden errors. These blocks disrupt the user experience and prevent legitimate receipt uploads. The extension needs to:

1. Reliably detect when Cloudflare (not the origin server) is blocking requests
2. Provide clear, actionable feedback to users
3. Log diagnostic information for troubleshooting
4. Offer automated and manual workarounds

## Research Findings

### Cloudflare Block Characteristics

**Response Indicators:**
- HTTP Status: 403 (most common), 503 (under load), 429 (rate limiting)
- Headers: `CF-Ray` header present in all Cloudflare responses
- Body: HTML containing "Cloudflare Ray ID", "error code 1020", or challenge pages
- Missing: Expected API JSON response structure

**Common Triggers:**
- File extensions: `.exe`, `.bat`, `.cmd`, `.scr`, `.com`
- File content: Binary data in PDFs, certain image metadata
- Multipart boundaries: Malformed or suspicious patterns
- User-Agent: Missing, outdated, or bot-like values
- File names: Special characters, double dashes (`--`), SQL-like patterns

### WAF Rule Categories

1. **OWASP Managed Rules**: Triggered by binary content in multipart uploads
2. **File Type Rules**: Block executable and script extensions
3. **Bot Management**: Detect non-browser User-Agents
4. **Custom Rules**: Site-specific patterns set by Navan

## Implementation Strategies

### Strategy 1: Response Header Detection

**Approach:**
```javascript
class CloudflareDetector {
  static isBlocked(response) {
    const cfRay = response.headers.get('cf-ray');
    const blockStatus = [403, 503, 429].includes(response.status);
    return cfRay && blockStatus;
  }
  
  static extractRayId(response) {
    return response.headers.get('cf-ray') || 'unknown';
  }
}
```

**Pros:**
- Simple and fast detection
- CF-Ray header is reliable indicator
- No need to parse response body
- Works with all response types

**Cons:**
- May miss origin server 403s with CF proxy
- Doesn't distinguish block types (WAF vs rate limit)
- No insight into specific trigger

**Implementation Effort:** Low (2 hours)

### Strategy 2: Response Body Pattern Matching

**Approach:**
```javascript
class CloudflareDetector {
  static async isBlocked(response) {
    if (response.status !== 403) return false;
    
    const text = await response.text();
    const patterns = [
      /Cloudflare Ray ID: ([a-f0-9]+)/i,
      /error code: 1020/i,
      /Access denied.*Cloudflare/i,
      /cf-error-details/
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }
}
```

**Pros:**
- More accurate detection
- Can extract error codes
- Distinguishes CF blocks from origin 403s
- Provides block reason

**Cons:**
- Requires buffering response body
- Slower than header check
- Pattern matching may break with CF updates
- Consumes response stream

**Implementation Effort:** Medium (4 hours)

### Strategy 3: Hybrid Detection with Fallback

**Approach:**
```javascript
class CloudflareDetector {
  static async detect(response) {
    // Fast path: header check
    const cfRay = response.headers.get('cf-ray');
    const isErrorStatus = response.status >= 400;
    
    if (!cfRay || !isErrorStatus) {
      return { blocked: false };
    }
    
    // Slow path: body analysis for details
    const responseClone = response.clone();
    const text = await responseClone.text();
    
    return {
      blocked: true,
      rayId: cfRay,
      type: this.detectBlockType(text),
      errorCode: this.extractErrorCode(text),
      isChallenge: text.includes('cf-challenge')
    };
  }
}
```

**Pros:**
- Best of both approaches
- Fast detection with detailed analysis
- Graceful degradation
- Rich diagnostic data

**Cons:**
- Most complex implementation
- Response cloning overhead
- More code to maintain

**Implementation Effort:** High (6 hours)

## Workaround Strategies

### Strategy A: Automatic File Conversion

**Approach:**
```javascript
class FileWorkarounds {
  static async applyWorkarounds(file, previousAttempts = []) {
    // Progressive enhancement based on failures
    if (previousAttempts.length === 0) {
      return file; // Try original first
    }
    
    if (previousAttempts.includes('original')) {
      // Convert problematic image formats
      if (file.type === 'image/heic') {
        return await this.convertToJpeg(file);
      }
      // Add more conversions as needed
    }
    
    if (previousAttempts.includes('converted')) {
      // Last resort: ZIP compression
      return await this.compressToZip(file);
    }
    
    return null; // No more workarounds
  }
}
```

**Pros:**
- Seamless user experience
- Handles common cases automatically
- Progressive enhancement
- Maintains file usability

**Cons:**
- Requires image conversion libraries
- Increases bundle size
- May alter file quality
- Processing overhead

### Strategy B: Request Header Manipulation

**Approach:**
```javascript
class RequestWorkarounds {
  static enhanceHeaders(headers, file) {
    // Mimic real browser
    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0';
    
    // Add legitimate referrer
    headers['Referer'] = 'https://app.navan.com/';
    
    // Ensure proper content type
    if (!headers['Content-Type']) {
      headers['Content-Type'] = `multipart/form-data; boundary=${this.generateBoundary()}`;
    }
    
    return headers;
  }
  
  static generateBoundary() {
    // Add semicolon trick discovered in research
    return `----WebKitFormBoundary${Math.random().toString(36).substr(2)};`;
  }
}
```

**Pros:**
- No file modification
- Prevents many blocks proactively
- Simple to implement
- No user interaction needed

**Cons:**
- May not work for content-based blocks
- Could be detected as evasion
- Requires testing across file types

### Strategy C: Manual User Workarounds

**Approach:**
```javascript
class UserWorkarounds {
  static getWorkaroundInstructions(file, blockType) {
    const instructions = {
      'image/heic': [
        'Convert to JPEG using Preview or online converter',
        'Take screenshot of the receipt instead',
        'Use your phone to save as JPEG before uploading'
      ],
      'application/pdf': [
        'Open PDF and "Print to PDF" to create clean version',
        'Extract pages as images if PDF is small',
        'Compress PDF using online tools'
      ],
      'default': [
        'Rename file to remove special characters',
        'Compress file as ZIP before uploading',
        'Try uploading from different network'
      ]
    };
    
    return instructions[file.type] || instructions.default;
  }
}
```

**Pros:**
- No code complexity
- User maintains control
- Works for all file types
- No automatic modifications

**Cons:**
- Requires user action
- Interrupts workflow
- May frustrate users
- Support burden

## Error Recovery Flow

### Recommended Implementation

```javascript
class CloudflareErrorHandler {
  async handleUploadError(error, file, attempt = 1) {
    // 1. Detect if Cloudflare block
    const detection = await CloudflareDetector.detect(error.response);
    if (!detection.blocked) {
      throw error; // Not CF, let normal error handling proceed
    }
    
    // 2. Log diagnostics
    await this.logBlockEvent(detection, file);
    
    // 3. Apply automatic workarounds
    if (attempt <= 3) {
      const workaroundFile = await FileWorkarounds.applyWorkarounds(
        file, 
        this.previousAttempts
      );
      
      if (workaroundFile) {
        this.previousAttempts.push(`attempt-${attempt}`);
        return this.retryUpload(workaroundFile, attempt + 1);
      }
    }
    
    // 4. Show user guidance
    return {
      success: false,
      error: 'cloudflare_block',
      rayId: detection.rayId,
      userMessage: this.getUserMessage(detection, file),
      workarounds: UserWorkarounds.getWorkaroundInstructions(file, detection.type),
      canRetry: true
    };
  }
  
  getUserMessage(detection, file) {
    if (detection.isChallenge) {
      return 'Security verification required. Please try again in a few moments.';
    }
    
    const fileType = file.type.split('/')[0];
    const messages = {
      'image': 'This image format triggered security checks. Try converting to JPEG.',
      'application': 'This file was blocked by security. Try compressing it as ZIP.',
      'default': `Upload blocked (Ray: ${detection.rayId}). See workarounds below.`
    };
    
    return messages[fileType] || messages.default;
  }
}
```

## Diagnostic Logging

### Comprehensive Event Logging

```javascript
class CloudflareDiagnostics {
  static async logBlockEvent(detection, file, request, response) {
    const diagnostic = {
      timestamp: new Date().toISOString(),
      eventType: 'cloudflare_block',
      
      detection: {
        rayId: detection.rayId,
        errorCode: detection.errorCode,
        blockType: detection.type,
        isChallenge: detection.isChallenge
      },
      
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        extension: file.name.split('.').pop(),
        namePatterns: this.detectNamePatterns(file.name)
      },
      
      request: {
        url: request.url,
        method: request.method,
        headers: this.sanitizeHeaders(request.headers),
        timestamp: request.timestamp
      },
      
      response: {
        status: response.status,
        headers: this.extractCfHeaders(response.headers),
        bodySnippet: detection.bodySnippet
      },
      
      environment: {
        userAgent: navigator.userAgent,
        extensionVersion: chrome.runtime.getManifest().version,
        platform: navigator.platform
      }
    };
    
    // Store in Chrome local storage (rotating buffer)
    await this.storeDiagnostic(diagnostic);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Cloudflare Block Detected:', diagnostic);
    }
    
    return diagnostic;
  }
  
  static async storeDiagnostic(diagnostic) {
    const storage = await chrome.storage.local.get('cfDiagnostics');
    const diagnostics = storage.cfDiagnostics || [];
    
    diagnostics.unshift(diagnostic);
    
    // Keep only last 20 events
    if (diagnostics.length > 20) {
      diagnostics.pop();
    }
    
    await chrome.storage.local.set({ cfDiagnostics: diagnostics });
  }
  
  static async exportDiagnostics() {
    const storage = await chrome.storage.local.get('cfDiagnostics');
    return JSON.stringify(storage.cfDiagnostics || [], null, 2);
  }
}
```

## Recommended Implementation Plan

### Phase 1: Detection & Logging (Week 1)
1. Implement hybrid detection strategy
2. Add comprehensive diagnostic logging
3. Create diagnostic export functionality
4. Add development mode console warnings

### Phase 2: Basic Workarounds (Week 2)
1. Implement request header enhancement
2. Add user-friendly error messages
3. Create workaround instruction display
4. Add CF Ray ID to error messages

### Phase 3: Advanced Recovery (Week 3)
1. Implement automatic file conversion for images
2. Add ZIP compression fallback
3. Create retry logic with backoff
4. Add success rate tracking

### Phase 4: Testing & Documentation (Week 4)
1. Test with various file types
2. Document workarounds for users
3. Create support troubleshooting guide
4. Add metrics collection

## Architecture Integration

### Component Modifications

**1. HTTP Client (`http-client.ts`):**
```typescript
class ApiHttpClient {
  async uploadFile(file: File, metadata: any): Promise<Response> {
    try {
      const enhancedHeaders = RequestWorkarounds.enhanceHeaders(
        this.headers,
        file
      );
      
      const response = await fetch(url, {
        method: 'POST',
        headers: enhancedHeaders,
        body: formData
      });
      
      if (!response.ok) {
        const cfHandler = new CloudflareErrorHandler();
        return await cfHandler.handleUploadError(
          { response },
          file
        );
      }
      
      return response;
    } catch (error) {
      // Network errors, etc.
      throw error;
    }
  }
}
```

**2. Receipt Service (`receipt-service.ts`):**
```typescript
class ReceiptService {
  async attachReceipt(expenseId: string, file: File): Promise<AttachResult> {
    const result = await this.httpClient.uploadFile(file, { expenseId });
    
    if (result.error === 'cloudflare_block') {
      // Show user workarounds in UI
      this.messageAdapter.send({
        type: 'SHOW_CF_WORKAROUNDS',
        workarounds: result.workarounds,
        rayId: result.rayId
      });
    }
    
    return result;
  }
}
```

**3. UI Component (`file-upload.ts`):**
```typescript
class FileUploadComponent {
  handleCloudflareBlock(error: CloudflareError) {
    this.showError({
      title: 'Upload Blocked by Security',
      message: error.userMessage,
      details: `Ray ID: ${error.rayId}`,
      actions: [
        {
          label: 'Try Workarounds',
          onClick: () => this.showWorkarounds(error.workarounds)
        },
        {
          label: 'Export Diagnostics',
          onClick: () => this.exportDiagnostics()
        }
      ]
    });
  }
}
```

## Testing Strategy

### Unit Tests
- CloudflareDetector with various response types
- FileWorkarounds conversion logic
- Diagnostic logging with storage limits
- Header enhancement logic

### Integration Tests
- Full upload flow with CF block simulation
- Retry logic with progressive workarounds
- Diagnostic export functionality
- User messaging flow

### Manual Testing Checklist
- [ ] HEIC image upload triggers conversion
- [ ] PDF with binary content shows workarounds
- [ ] Large files suggest compression
- [ ] Ray ID appears in error messages
- [ ] Diagnostics export contains useful data
- [ ] Retry with ZIP succeeds
- [ ] User instructions are clear

## Success Metrics

1. **Detection Rate**: >95% of CF blocks correctly identified
2. **Auto-Recovery Rate**: >60% of blocks resolved automatically
3. **User Success Rate**: >90% succeed with manual workarounds
4. **Support Tickets**: <5% of upload failures escalate to support
5. **Diagnostic Quality**: Ray ID present in 100% of reports

## Security Considerations

1. **No Credential Logging**: Sanitize auth headers in diagnostics
2. **PII Protection**: Don't log file contents
3. **Storage Limits**: Rotate diagnostic logs
4. **User Consent**: Inform users about diagnostic collection
5. **Export Control**: Require user action for diagnostic export

## Conclusion

The recommended approach combines:
1. **Hybrid detection** for reliability and detail
2. **Progressive workarounds** for automatic recovery
3. **Comprehensive logging** for troubleshooting
4. **Clear user guidance** for manual resolution

This balanced strategy minimizes user friction while providing robust error handling and diagnostic capabilities for support.

## Appendix: Common Cloudflare Error Codes

| Code | Description | Typical Cause |
|------|-------------|---------------|
| 1020 | Access Denied | WAF rule triggered |
| 1015 | Rate Limited | Too many requests |
| 1009 | Access Denied (Country) | Geographic restriction |
| 1010 | Browser Check | Bot detection triggered |
| 1012 | Access Denied (Banned) | IP reputation block |

## References

- Cloudflare WAF Documentation
- Chrome Extension WebRequest API
- Multipart Form Data RFC 7578
- Research findings from Brave search (2025-08-06)