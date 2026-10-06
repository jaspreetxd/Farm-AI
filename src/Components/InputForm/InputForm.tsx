import { useState, useRef, useEffect } from 'react';
import { LuCamera, LuType, LuUpload, LuX } from 'react-icons/lu';
import toast from 'react-hot-toast';
import type { AnalyzeRequest } from '../../services/ResultAI/mockData';
import './InputForm.css';

interface InputFormProps {
  onAnalyze: (data: AnalyzeRequest) => void;
  disabled: boolean;
}

type TabType = 'text' | 'photo';

const InputForm = ({ onAnalyze, disabled }: InputFormProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('text');
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [textInput]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'text' && !textInput.trim()) {
      toast.error('Please describe your problem first.');
      return;
    }

    if (activeTab === 'photo') {
      if (!selectedFile || !imageRef.current) {
        toast.error('Please upload a photo first.');
        return;
      }
      onAnalyze({ type: activeTab, imageElement: imageRef.current });
      return;
    }

    onAnalyze({ type: activeTab, content: textInput });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      toast.success('File attached successfully!');
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="input-form-container glass">
      <div className="input-tabs">
        <button
          className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => handleTabChange('text')}
          type="button"
        >
          <LuType /> Text
        </button>
        <button
          className={`tab-btn ${activeTab === 'photo' ? 'active' : ''}`}
          onClick={() => handleTabChange('photo')}
          type="button"
        >
          <LuCamera /> Photo
        </button>
      </div>

      <form onSubmit={handleSubmit} className="input-body">
        {activeTab === 'text' && (
          <div className="text-input-wrapper">
            <textarea
              ref={textAreaRef}
              placeholder="Ask about crops, plants, pests, soil, irrigation, tools, or farm equipment..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={disabled}
              rows={4}
            />
          </div>
        )}

        {activeTab === 'photo' && (
          <div className="upload-wrapper">
            {!previewUrl ? (
              <>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden-input"
                  onChange={handleFileUpload}
                  accept="image/*"
                  disabled={disabled}
                />
                <label htmlFor="file-upload" className="upload-box">
                  <LuUpload className="upload-icon" />
                  <h3>Upload your photo</h3>
                  <p>Drag and drop or click to browse</p>
                </label>
              </>
            ) : (
              <div className="preview-container">
                <img 
                  ref={imageRef} 
                  src={previewUrl} 
                  alt="Preview" 
                  crossOrigin="anonymous" 
                  className="image-preview" 
                />
                <button type="button" className="clear-btn" onClick={clearFile} disabled={disabled}>
                  <LuX /> Remove Photo
                </button>
              </div>
            )}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary submit-btn" disabled={disabled}>
            {disabled ? 'Processing...' : 'Analyze Problem'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InputForm;

