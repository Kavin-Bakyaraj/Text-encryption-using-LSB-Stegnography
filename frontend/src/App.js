import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import './App.css';

// Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];

// Custom hook for file validation
const useFileValidation = () => {
  const validateFile = useCallback((file) => {
    if (!file) {
      return { isValid: false, error: 'No file selected' };
    }
    
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return { 
        isValid: false, 
        error: 'Unsupported file format. Please upload JPEG, PNG, GIF, BMP, or WebP images.' 
      };
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return { 
        isValid: false, 
        error: 'File size too large. Please upload images smaller than 10MB.' 
      };
    }
    
    return { isValid: true, error: null };
  }, []);

  return { validateFile };
};

// Loading spinner component
const LoadingSpinner = () => (
  <div className="spinner">
    <div className="spinner-ring"></div>
  </div>
);

// Error message component
const ErrorMessage = ({ message, onClose }) => (
  <div className="error-message">
    <div className="error-content">
      <span className="error-icon">⚠️</span>
      <span className="error-text">{message}</span>
      <button className="error-close" onClick={onClose} aria-label="Close error">×</button>
    </div>
  </div>
);

// Success message component
const SuccessMessage = ({ message, onClose }) => (
  <div className="success-message">
    <div className="success-content">
      <span className="success-icon">✅</span>
      <span className="success-text">{message}</span>
      <button className="success-close" onClick={onClose} aria-label="Close success">×</button>
    </div>
  </div>
);

// Image preview component
const ImagePreview = ({ file, onRemove }) => {
  const [previewUrl, setPreviewUrl] = useState(null);

  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  if (!file || !previewUrl) return null;

  return (
    <div className="image-preview-container">
      <img src={previewUrl} alt="Preview" className="image-preview" />
      <div className="image-info">
        <span className="image-name">{file.name}</span>
        <span className="image-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
      </div>
      <button className="remove-image" onClick={onRemove} aria-label="Remove image">
        Remove
      </button>
    </div>
  );
};

// Main App component
function App() {
  // State management
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [injectLoading, setInjectLoading] = useState(false);
  const [detectLoading, setDetectLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Refs
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);

  // Custom hooks
  const { validateFile } = useFileValidation();

  // Helper functions
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const resetForm = useCallback(() => {
    setImage(null);
    setMessage('');
    setResult(null);
    clearMessages();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [clearMessages]);

  // File handling
  const handleFileSelect = useCallback((file) => {
    clearMessages();
    
    const validation = validateFile(file);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setImage(file);
    setResult(null);
  }, [validateFile, clearMessages]);

  const handleImageChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleImageRemove = useCallback(() => {
    setImage(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // API calls with proper error handling
  const handleInject = useCallback(async () => {
    if (!image || !message.trim()) {
      setError('Please select an image and enter a message');
      return;
    }

    setInjectLoading(true);
    clearMessages();

    try {
      const formData = new FormData();
      formData.append('file', image);
      formData.append('message', message.trim());

      const response = await axios.post(`${API_BASE_URL}/inject`, formData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds timeout
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      setResult({ type: 'inject', url, filename: `steganography_${Date.now()}.png` });
      setSuccess('Message successfully injected into image!');
      
    } catch (error) {
      console.error('Injection error:', error);
      
      if (error.code === 'ECONNABORTED') {
        setError('Request timed out. Please try again.');
      } else if (error.response?.status === 413) {
        setError('File too large. Please try a smaller image.');
      } else if (error.response?.status === 400) {
        setError('Invalid request. Please check your input and try again.');
      } else if (error.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Failed to inject message. Please check your connection and try again.');
      }
    } finally {
      setInjectLoading(false);
    }
  }, [image, message, clearMessages]);

  const handleDetect = useCallback(async () => {
    if (!image) {
      setError('Please select an image');
      return;
    }

    setDetectLoading(true);
    clearMessages();

    try {
      const formData = new FormData();
      formData.append('file', image);

      const response = await axios.post(`${API_BASE_URL}/detect`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds timeout
      });

      setResult({ type: 'detect', ...response.data });
      
      if (response.data.extracted_message) {
        setSuccess('Hidden message detected successfully!');
      } else {
        setSuccess('No hidden message found in this image.');
      }
      
    } catch (error) {
      console.error('Detection error:', error);
      
      if (error.code === 'ECONNABORTED') {
        setError('Request timed out. Please try again.');
      } else if (error.response?.status === 413) {
        setError('File too large. Please try a smaller image.');
      } else if (error.response?.status === 400) {
        setError('Invalid request. Please check your input and try again.');
      } else if (error.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Failed to detect message. Please check your connection and try again.');
      }
    } finally {
      setDetectLoading(false);
    }
  }, [image, clearMessages]);

  // Download handler for injected images
  const handleDownload = useCallback(() => {
    if (result?.type === 'inject' && result.url) {
      const link = document.createElement('a');
      link.href = result.url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [result]);

  // Copy to clipboard handler
  const handleCopyMessage = useCallback(async () => {
    if (result?.extracted_message) {
      try {
        await navigator.clipboard.writeText(result.extracted_message);
        setSuccess('Message copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        setError('Failed to copy message to clipboard');
      }
    }
  }, [result]);

  const isProcessing = injectLoading || detectLoading;

  return (
    <div className="app">
      <div className="background-animation"></div>
      
      <header className="app-header">
        <h1>Image Steganography</h1>
        <p className="app-subtitle">Hide and discover secret messages in images</p>
      </header>

      <main className="container">
        {/* Error and Success Messages */}
        {error && <ErrorMessage message={error} onClose={() => setError(null)} />}
        {success && <SuccessMessage message={success} onClose={() => setSuccess(null)} />}

        {/* File Upload Section */}
        <section className="form-section">
          <div className="form-group">
            <label htmlFor="file-input" className="form-label">
              Upload Image <span className="required">*</span>
            </label>
            
            <div
              className={`file-drop-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {!image ? (
                <>
                  <div className="drop-zone-content">
                    <div className="upload-icon">📁</div>
                    <p>Drag and drop an image here, or</p>
                    <button
                      type="button"
                      className="upload-button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                    >
                      Choose File
                    </button>
                  </div>
                  <input
                    id="file-input"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="file-input-hidden"
                    disabled={isProcessing}
                  />
                </>
              ) : (
                <ImagePreview file={image} onRemove={handleImageRemove} />
              )}
            </div>
            
            <div className="file-info">
              <small>Supported formats: JPEG, PNG, GIF, BMP, WebP (Max: 10MB)</small>
            </div>
          </div>

          {/* Message Input */}
          <div className="form-group">
            <label htmlFor="message-input" className="form-label">
              Secret Message
            </label>
            <textarea
              id="message-input"
              ref={messageInputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your secret message here..."
              className="message-input"
              rows="4"
              disabled={isProcessing}
              maxLength="1000"
            />
            <div className="character-count">
              {message.length}/1000 characters
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="actions-section">
          <div className="button-group">
            <button
              onClick={handleInject}
              disabled={!image || !message.trim() || injectLoading}
              className="action-button inject-button"
            >
              {injectLoading ? (
                <>
                  <LoadingSpinner />
                  <span>Injecting...</span>
                </>
              ) : (
                <>
                  <span className="button-icon">🔒</span>
                  <span>Hide Message</span>
                </>
              )}
            </button>

            <button
              onClick={handleDetect}
              disabled={!image || detectLoading}
              className="action-button detect-button"
            >
              {detectLoading ? (
                <>
                  <LoadingSpinner />
                  <span>Detecting...</span>
                </>
              ) : (
                <>
                  <span className="button-icon">🔍</span>
                  <span>Reveal Message</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={resetForm}
            disabled={isProcessing}
            className="reset-button"
          >
            Clear All
          </button>
        </section>

        {/* Results Section */}
        {result && (
          <section className="results-section">
            {result.type === 'inject' && (
              <div className="result-card inject-result">
                <h3>✅ Message Hidden Successfully!</h3>
                <p>Your secret message has been embedded into the image.</p>
                <div className="result-actions">
                  <button onClick={handleDownload} className="download-button">
                    📥 Download Image
                  </button>
                </div>
              </div>
            )}

            {result.type === 'detect' && (
              <div className="result-card detect-result">
                <h3>🔍 Detection Results</h3>
                
                {result.extracted_message ? (
                  <div className="message-result">
                    <div className="message-header">
                      <h4>Hidden Message Found:</h4>
                      <button
                        onClick={handleCopyMessage}
                        className="copy-button"
                        title="Copy to clipboard"
                      >
                        📋
                      </button>
                    </div>
                    <div className="extracted-message">
                      {result.extracted_message}
                    </div>
                  </div>
                ) : (
                  <div className="no-message">
                    <p>No hidden message detected in this image.</p>
                  </div>
                )}

                {result.ai_analysis && (
                  <div className="ai-analysis">
                    <h4>AI Analysis:</h4>
                    <p>{result.ai_analysis}</p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Help Section */}
        <section className="help-section">
          <details className="help-details">
            <summary>How to use Image Steganography</summary>
            <div className="help-content">
              <div className="help-item">
                <h4>🔒 Hide a Message:</h4>
                <ol>
                  <li>Upload an image (JPEG, PNG, GIF, BMP, or WebP)</li>
                  <li>Enter your secret message</li>
                  <li>Click "Hide Message"</li>
                  <li>Download the processed image</li>
                </ol>
              </div>
              <div className="help-item">
                <h4>🔍 Reveal a Message:</h4>
                <ol>
                  <li>Upload an image that may contain a hidden message</li>
                  <li>Click "Reveal Message"</li>
                  <li>View the extracted message if found</li>
                </ol>
              </div>
              <div className="help-item">
                <h4>💡 Tips:</h4>
                <ul>
                  <li>Larger images can hide longer messages</li>
                  <li>The modified image will look identical to the original</li>
                  <li>Keep your original image safe for comparison</li>
                  <li>Image compression may affect hidden messages</li>
                </ul>
              </div>
            </div>
          </details>
        </section>
      </main>

      <footer className="app-footer">
        <p>&copy; 2024 Image Steganography Tool. All rights reserved.</p>
        <p>Secure • Private • Professional</p>
      </footer>
    </div>
  );
}

export default App;