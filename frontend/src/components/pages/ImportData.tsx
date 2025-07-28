import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface JSONLMessage {
  type: 'user' | 'assistant' | 'summary' | 'system' | string;
  message: string;
  timestamp: string;
  sessionId: string;
  uuid: string;
  toolUseResult?: any;
}

interface ImportStats {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  sessions: number;
  dateRange: {
    start: string;
    end: string;
  };
}

const ImportData: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<JSONLMessage[]>([]);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setUploadProgress(0);
    setParseErrors([]);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const parsed: JSONLMessage[] = [];
      const errors: string[] = [];
      
      // Parse each line
      lines.forEach((line, index) => {
        try {
          const obj = JSON.parse(line);
          
          // Validate required fields
          if (!obj.type || !obj.timestamp || !obj.sessionId || !obj.uuid) {
            errors.push(`Line ${index + 1}: Missing required fields`);
            return;
          }
          
          parsed.push(obj);
        } catch (err) {
          errors.push(`Line ${index + 1}: Invalid JSON`);
        }
        
        // Update progress
        setUploadProgress(Math.round(((index + 1) / lines.length) * 100));
      });
      
      if (errors.length > 0) {
        setParseErrors(errors.slice(0, 5)); // Show first 5 errors
        if (errors.length > 5) {
          setParseErrors(prev => [...prev, `...and ${errors.length - 5} more errors`]);
        }
      }
      
      setParsedData(parsed);
      
      // Calculate stats
      if (parsed.length > 0) {
        const sessionIds = new Set(parsed.map(msg => msg.sessionId));
        const timestamps = parsed.map(msg => new Date(msg.timestamp).getTime());
        
        setImportStats({
          totalMessages: parsed.length,
          userMessages: parsed.filter(msg => msg.type === 'user').length,
          assistantMessages: parsed.filter(msg => msg.type === 'assistant').length,
          sessions: sessionIds.size,
          dateRange: {
            start: new Date(Math.min(...timestamps)).toLocaleDateString(),
            end: new Date(Math.max(...timestamps)).toLocaleDateString()
          }
        });
        
        toast.success(`Successfully parsed ${parsed.length} messages`);
      }
    } catch (error) {
      toast.error('Failed to process file');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.jsonl')) {
      setFile(droppedFile);
      await processFile(droppedFile);
    } else {
      toast.error('Please upload a valid JSONL file');
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.jsonl')) {
      setFile(selectedFile);
      await processFile(selectedFile);
    } else {
      toast.error('Please upload a valid JSONL file');
    }
  };

  const handleImport = async () => {
    if (!parsedData.length || !user) {
      toast.error('No data to import');
      return;
    }
    
    setIsProcessing(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8281';
      const response = await fetch(`${apiUrl}/api/import`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: parsedData,
          user_id: user.id 
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Import failed');
      }
      
      const result = await response.json();
      toast.success(result.message || 'Data imported successfully!');
      
      // TODO: Navigate to dashboard or refresh leaderboards
    } catch (error) {
      toast.error('Failed to import data');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Import Your Data</h1>
        <p className="text-muted">Upload your Sniffly JSONL export to populate your Claude Arena profile</p>
      </div>

      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200
          ${isDragging 
            ? 'border-accent-blue bg-accent-blue/10' 
            : 'border-gray-600 hover:border-gray-500'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".jsonl"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          disabled={isProcessing}
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center">
            {isProcessing ? (
              <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-gray-400" />
            )}
          </div>
          
          {!file ? (
            <>
              <div className="space-y-1">
                <p className="text-lg font-medium">Drop your JSONL file here</p>
                <p className="text-sm text-muted">or click to browse</p>
              </div>
              <label
                htmlFor="file-upload"
                className="btn-primary inline-block cursor-pointer"
              >
                Select File
              </label>
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-accent-blue" />
                <span className="font-medium">{file.name}</span>
                <span className="text-sm text-muted">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              
              {isProcessing && (
                <div className="w-full max-w-xs mx-auto">
                  <div className="flex justify-between text-sm text-muted mb-1">
                    <span>Processing...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-accent-blue transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Parse Errors */}
      {parseErrors.length > 0 && (
        <div className="card border-accent-red/50 bg-accent-red/10">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium text-accent-red">Parse Errors</p>
              <ul className="text-sm text-muted space-y-1">
                {parseErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Import Stats */}
      {importStats && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Import Summary</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-sm text-muted mb-1">Total Messages</p>
              <p className="text-2xl font-bold">{importStats.totalMessages.toLocaleString()}</p>
            </div>
            <div className="card">
              <p className="text-sm text-muted mb-1">User Messages</p>
              <p className="text-2xl font-bold">{importStats.userMessages.toLocaleString()}</p>
            </div>
            <div className="card">
              <p className="text-sm text-muted mb-1">Assistant Messages</p>
              <p className="text-2xl font-bold">{importStats.assistantMessages.toLocaleString()}</p>
            </div>
            <div className="card">
              <p className="text-sm text-muted mb-1">Sessions</p>
              <p className="text-2xl font-bold">{importStats.sessions.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="card">
            <p className="text-sm text-muted mb-1">Date Range</p>
            <p className="font-medium">
              {importStats.dateRange.start} - {importStats.dateRange.end}
            </p>
          </div>
        </div>
      )}

      {/* Preview */}
      {parsedData.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Data Preview</h2>
            <span className="text-sm text-muted">Showing first 5 messages</span>
          </div>
          
          <div className="space-y-3">
            {parsedData.slice(0, 5).map((msg, index) => (
              <div key={index} className="card">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`
                      px-2 py-1 rounded text-xs font-medium
                      ${msg.type === 'user' 
                        ? 'bg-accent-blue/20 text-accent-blue' 
                        : msg.type === 'assistant'
                        ? 'bg-accent-green/20 text-accent-green'
                        : 'bg-gray-700 text-gray-300'
                      }
                    `}>
                      {msg.type}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-muted font-mono">
                    {msg.sessionId.slice(0, 8)}...
                  </span>
                </div>
                <p className="text-sm text-muted line-clamp-2">
                  {msg.message || '(No message content)'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Button */}
      {parsedData.length > 0 && !isProcessing && (
        <div className="flex justify-center gap-4">
          <button
            onClick={() => {
              setFile(null);
              setParsedData([]);
              setImportStats(null);
              setParseErrors([]);
            }}
            className="btn-secondary"
          >
            Clear Data
          </button>
          <button
            onClick={handleImport}
            className="btn-primary"
          >
            Import {parsedData.length.toLocaleString()} Messages
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="card border-accent-blue/50 bg-accent-blue/10">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="font-medium text-accent-blue">About JSONL Format</p>
            <p className="text-muted">
              Your Sniffly export should be in JSONL format where each line is a valid JSON object containing:
            </p>
            <ul className="list-disc list-inside text-muted space-y-1 ml-4">
              <li><code className="text-xs bg-gray-800 px-1 py-0.5 rounded">type</code> - Message type (user, assistant, summary, etc.)</li>
              <li><code className="text-xs bg-gray-800 px-1 py-0.5 rounded">message</code> - The actual message content</li>
              <li><code className="text-xs bg-gray-800 px-1 py-0.5 rounded">timestamp</code> - When the message was created</li>
              <li><code className="text-xs bg-gray-800 px-1 py-0.5 rounded">sessionId</code> - Unique session identifier</li>
              <li><code className="text-xs bg-gray-800 px-1 py-0.5 rounded">uuid</code> - Unique message identifier</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportData;