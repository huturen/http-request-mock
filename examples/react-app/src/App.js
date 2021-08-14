import './css/App.css';
import FetchComponent from './components/FetchComponent.js';
import XhrComponent from './components/XhrComponent.js';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <FetchComponent />
        <XhrComponent />
      </header>
    </div>
  );
}

export default App;
