import { useState } from 'react';
import video from '../../assets/backgroundvideos/greenfield.mp4';
import './BackgroundAnimation.css';

const BackgroundAnimation = () => {
  const [currentVideo, setCurrentVideo] = useState(0);
  const videos = [video];

  return (
    <div className="bg-animation-container">
      <video
        key={currentVideo}
        className="bg-video"
        src={videos[currentVideo]}
        autoPlay
        muted
        playsInline
        onEnded={() => setCurrentVideo((prev) => (prev + 1) % videos.length)}
      />
      <div className="bg-overlay"></div>
    </div>
  );
};

export default BackgroundAnimation;
