import { useState } from 'react';
import Hero from '../../Components/Hero/Hero';
import InputForm from '../../Components/InputForm/InputForm';
import ResultCard from '../../Components/ResultCard/ResultCard';
import Loading from '../../Components/Loading/Loading';
import { analyzeCropIssue } from '../../services/ResultAI/mockData';
import { fetchWeather } from '../../services/WeatherAI/weatherai';
import { generateThumbnail } from '../../services/HistoryService/historyService';
import type { AnalysisResult, AnalyzeRequest } from '../../services/ResultAI/mockData';
import './Home.css';

interface HomeProps {
  result: AnalysisResult | null;
  setResult: (result: AnalysisResult | null) => void;
  onAddHistory: (
    type: 'text' | 'photo' | 'audio' | 'video',
    queryText: string,
    result: AnalysisResult,
    thumbnail?: string
  ) => void;
}

const Home = ({ result, setResult, onAddHistory }: HomeProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async (data: AnalyzeRequest) => {
    setIsLoading(true);
    setResult(null);
    
    // Capture the image element before async functions execute
    const imageEl = data.imageElement;
    
    try {
      // Try to get location and weather
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
              timeout: 15000, 
              enableHighAccuracy: false 
            });
          });
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          data.location = { lat, lon };
          
          const weather = await fetchWeather(lat, lon);
          if (weather) {
            data.weather = weather;
          }
        } catch (geoError) {
          console.warn('Geolocation failed or denied:', geoError);
        }
      }

      const response = await analyzeCropIssue(data);
      setResult(response);

      // Determine query text and thumbnail for history entry
      let queryText = 'Diagnosis';
      let thumbnail: string | undefined = undefined;

      if (data.type === 'text') {
        queryText = data.content ? data.content.trim() : 'Text Diagnosis';
      } else if (data.type === 'photo') {
        queryText = 'Photo Analysis';
        if (imageEl) {
          thumbnail = generateThumbnail(imageEl);
        }
      } else if (data.type === 'audio') {
        queryText = 'Audio Command';
      } else if (data.type === 'video') {
        queryText = 'Video Analysis';
      }

      onAddHistory(data.type as any, queryText, response, thumbnail);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="home-page">
      <Hero />
      
      <section id="input-section" className="section-padding">
        <div className="container">
          <div className="section-header text-center">
            <h2>Describe the Problem</h2>
            <p>Upload a photo of the affected plant, or describe the symptoms below.</p>
          </div>
          
          <div className="diagnosis-container">
            <InputForm onAnalyze={handleAnalyze} disabled={isLoading} />
            
            {isLoading && (
              <div className="loading-wrapper animate-fade-in">
                <Loading />
              </div>
            )}
            
            {result && !isLoading && (
              <div className="result-wrapper animate-slide-up">
                <ResultCard data={result} />
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="features" className="section-padding bg-surface">
        <div className="container">
          <div className="section-header text-center">
            <h2>Why AgroRakshak?</h2>
            <p>Built specifically for modern farmers to maximize yield and minimize losses.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card glass">
              <div className="feature-icon">🔍</div>
              <h3>Instant Diagnosis</h3>
              <p>Identify diseases, pests, and nutrient deficiencies in seconds using our advanced AI.</p>
            </div>
            <div className="feature-card glass">
              <div className="feature-icon">📝</div>
              <h3>Actionable Plans</h3>
              <p>Get simple, step-by-step instructions on how to treat the problem effectively.</p>
            </div>
            <div className="feature-card glass">
              <div className="feature-icon">🛠️</div>
              <h3>Tool Recommendations</h3>
              <p>Know exactly what fertilizers, tools, or pesticides you need to get the job done.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
