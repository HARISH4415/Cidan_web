import bankingArtwork from '../assets/bank img.png'
import './Hero.css'

function BankingIllustration() {
  return (
    <div className="illustration-wrap" aria-hidden="true">
      <img className="banking-illustration" src={bankingArtwork} alt="" />
    </div>
  )
}

function Hero() {
  return (
    <div className="hero-content">
      <div className="hero-copy">
        <h1>Secure<br />Banking<br />Compliance<br /><span>Made Simple</span></h1>
        <p>Access compliance tools with your official bank account.</p>
        <div className="hero-assurance">
          <span className="assurance-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20"><path d="M10 2.2 16 4.5v4.2c0 4-2.5 7.1-6 9.1-3.5-2-6-5.1-6-9.1V4.5l6-2.3Z" /><path d="m7.2 9.7 1.8 1.8 3.8-4" /></svg>
          </span>
          Built for secure, regulated institutions
        </div>
      </div>
      <BankingIllustration />
    </div>
  )
}

export { Hero }
