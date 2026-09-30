import './Loading.css';

const Loading = () => {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Analyzing crop health...</p>
    </div>
  );
};

export default Loading;
