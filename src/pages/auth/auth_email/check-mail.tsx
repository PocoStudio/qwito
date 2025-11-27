import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CircleAlert, CircleCheckIcon, Loader2 } from 'lucide-react';
import { OTPInput, type SlotProps } from "input-otp";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from '@/config/api';

function CheckMail() {
  const [otp, setOtp] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<{ text: string; type: string }>({ text: '', type: '' });
  const [loading, setLoading] = useState<boolean>(false);
  const [tempToken, setTempToken] = useState<string>('');
  const [resendCount, setResendCount] = useState<number>(0);
  const [timer, setTimer] = useState<number>(0);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(3);
  const [cooldownTimer, setCooldownTimer] = useState<number>(0);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  // Extract URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    const tokenParam = params.get('tempToken');

    if (emailParam && tokenParam) {
      setEmail(emailParam);
      setTempToken(tokenParam);
      setTimer(60);
    } else {
      navigate('/register');
    }
  }, [location, navigate]);

  // Handle cooldown timer for attempts
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (cooldownTimer > 0) {
      interval = setInterval(() => {
        setCooldownTimer(prev => prev - 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cooldownTimer]);

  // Handle timer for resending code
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  // Hide messages after a delay
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message.text]);

  const handleResendCode = async () => {
    if (timer > 0) return;
    
    if (resendCount >= 5) { 
      setMessage({ text: 'Nombre maximum de renvois atteint. Veuillez recommencer l\'inscription.', type: 'error' });
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          tempToken
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.timeLeft) {
          setTimer(data.timeLeft);
          setMessage({ 
            text: `Veuillez attendre ${data.timeLeft} secondes avant de demander un nouveau code.`, 
            type: 'error' 
          });
        } else {
          setMessage({ 
            text: data.message || 'Erreur lors de l\'envoi du code', 
            type: 'error' 
          });
          if (response.status === 400 && data.message === 'Token invalide ou expiré') {
            setTimeout(() => navigate('/register'), 3000);
          }
        }
        throw new Error(data.message || 'Erreur lors de l\'envoi du code');
      }
      
      setTempToken(data.tempToken);
      setMessage({ text: 'Un nouveau code a été envoyé à votre adresse email', type: 'success' });
      setResendCount(prev => prev + 1);
      setTimer(60);
      setAttemptsLeft(3);
    } catch (error: any) {
      console.error('Erreur lors du renvoi du code:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Ajoutez cette vérification pour éviter les soumissions multiples
    if (loading) {
      console.log('Soumission déjà en cours, ignorée');
      return;
    }
    
    console.log('handleSubmit called with OTP:', otp); 

    if (cooldownTimer > 0) {
      setMessage({ text: `Veuillez attendre ${cooldownTimer} secondes avant de réessayer`, type: 'error' });
      return;
    }
    
    if (!otp || otp.length !== 6) {
      setMessage({ text: 'Veuillez entrer un code à 6 chiffres', type: 'error' });
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          verificationCode: otp,
          tempToken
        }),
      });
      
      console.log('API response status:', response.status); // Debug log
      const data = await response.json();
      console.log('API response data:', data); // Debug log
      
      if (!response.ok) {
        throw { response: { data } };
      }
      
      localStorage.setItem('token', data.token);
      setMessage({ text: 'Compte créé avec succès !', type: 'success' });
      setTimeout(() => {
        navigate('/panel');
      }, 2000);
    } catch (error: any) {
      console.error('Erreur lors de la vérification:', error); // Debug log
      const errorMessage = error.response?.data?.message || 'Une erreur est survenue lors de la vérification';
      setMessage({ text: errorMessage, type: 'error' });
      if (error.response?.data?.tempToken) {
        setTempToken(error.response.data.tempToken);
        setAttemptsLeft(error.response.data.attemptsLeft || 0);
      }
      if (error.response?.status === 400 && errorMessage === 'Token invalide ou expiré') {
        setTimeout(() => navigate('/register'), 3000);
      }
      setOtp(''); // Clear OTP input after error
      setCooldownTimer(5);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-svh bg-background relative">
      {message.text && (
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="mx-auto max-w-md p-4 animate-in fade-in-0 slide-in-from-top-4 duration-300">
            <div className={`rounded-md border px-4 py-3 bg-white ${message.type === 'error' ? 'border-red-500/50 text-red-600' : 'border-emerald-500/50 text-emerald-600'}`}>
              <p className="text-sm">
                {message.type === 'error' ? (
                  <CircleAlert
                    className="me-3 -mt-0.5 inline-flex opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                ) : (
                  <CircleCheckIcon
                    className="me-3 -mt-0.5 inline-flex opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                )}
                {message.text}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-md pointer-events-auto">
          <div className="rounded-lg border bg-card p-6 shadow-lg">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground">Vérification de l'email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Un code de vérification a été envoyé à <span className="font-medium">{email}</span>
              </p>
            </div>
            
            <div className="space-y-6 mt-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-foreground text-center">
                    Code de vérification
                  </label>
                  <div className="mt-1">
                    <OTPInput
                      id="otp"
                      ref={inputRef}
                      value={otp}
                      onChange={(value) => {
                        // Only allow digits
                        if (/^\d*$/.test(value)) {
                          console.log('OTP changed to:', value); // Debug log
                          setOtp(value);
                          // Ne pas appeler handleSubmit ici
                        }
                      }}
                      containerClassName="flex items-center gap-3 has-disabled:opacity-50 justify-center"
                      maxLength={6}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      disabled={loading || cooldownTimer > 0}
                      datatype="numeric"
                      render={({ slots }) => (
                        <div className="flex gap-2 justify-center">
                          {slots.map((slot, idx) => (
                            <Slot key={idx} {...slot} />
                          ))}
                        </div>
                      )}
                      onComplete={() => {
                        // Utilisez uniquement ce déclencheur pour soumettre le formulaire
                        console.log('onComplete triggered with OTP:', otp);
                        if (!loading && cooldownTimer === 0) {
                          handleSubmit();
                        }
                      }}
                    />
                  </div>
                  {attemptsLeft < 3 && (
                    <p className="mt-1 text-sm text-red-400 text-center">
                      {attemptsLeft} tentative{attemptsLeft > 1 ? 's' : ''} restante{attemptsLeft > 1 ? 's' : ''}
                    </p>
                  )}
                  {cooldownTimer > 0 && (
                    <p className="mt-1 text-sm text-red-400 text-center">
                      Veuillez attendre {cooldownTimer} seconde{cooldownTimer > 1 ? 's' : ''} avant de réessayer
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col space-y-4">
                {loading ? (
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : null}
                
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading || timer > 0 || resendCount >= 5}
                  className="text-sm text-primary hover:text-primary/80 disabled:text-muted-foreground disabled:cursor-not-allowed text-center"
                >
                  {timer > 0 
                    ? `Renvoyer le code (${timer}s)` 
                    : resendCount >= 5 
                      ? 'Nombre maximum de renvois atteint' 
                      : 'Renvoyer le code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slot(props: SlotProps) {
  return (
    <div
      className={cn(
        "border-input bg-background text-foreground flex size-9 items-center justify-center rounded-md border font-medium shadow-xs transition-[color,box-shadow]",
        { "border-ring ring-ring/50 z-10 ring-[3px]": props.isActive }
      )}
    >
      {props.char !== null && <div>{props.char}</div>}
    </div>
  );
}

export default CheckMail;