import verificationIllustration from '../assets/email-verification.png';
import './EmailVerificationIllustration.css';

export function EmailVerificationIllustration() {
  return (
    <div className="verification-art">
      <img
        className="verification-art__image"
        src={verificationIllustration}
        alt="A secure verification code in a purple envelope, with a checkmark and paper airplane"
      />
    </div>
  );
}
