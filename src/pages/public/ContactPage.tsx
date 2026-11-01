import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  CheckCircle2, 
  MessageSquare,
  Clock,
  ShieldCheck
} from 'lucide-react';

export const ContactPage: React.FC = () => {
  const { submitContactMessage, showToast, setCurrentView } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+221 ');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      showToast('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    submitContactMessage(name, email, phone, subject || 'Demande d’information Boutika', message);
    setSubmitted(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
          Support & Équipe
        </span>
        <h1 className="font-heading font-black text-4xl sm:text-5xl text-stone-900">
          Contactez l'équipe Boutika
        </h1>
        <p className="text-stone-600 text-sm sm:text-base">
          Une question sur votre future boutique, un partenariat ou besoin d'une démonstration personnalisée à Dakar ? Nous sommes à votre écoute.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Contact Info Side */}
        <div className="lg:col-span-5 bg-stone-900 text-white rounded-3xl p-8 space-y-8 shadow-xl">
          <div>
            <h3 className="font-heading font-bold text-2xl text-amber-400 mb-2">
              Boutika Sénégal
            </h3>
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              Basés à Dakar, nous accompagnons les commerçants du Plateau, de la Médina, des Almadies, de Pikine et de toutes les régions du Sénégal.
            </p>
          </div>

          <div className="space-y-5 text-xs sm:text-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-800 text-amber-500 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white">Bureau & Permanence</p>
                <p className="text-stone-400">Rue 14 angle Boulevard Dial Diop, Médina, Dakar, Sénégal</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-800 text-emerald-400 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white">WhatsApp & Téléphone</p>
                <p className="text-stone-400">+221 77 654 32 10 (Lun-Sam 8h-19h)</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-800 text-stone-400 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white">Courrier électronique</p>
                <p className="text-stone-400">contact@boutika.sn / support@boutika.sn</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-800 text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white">Délai moyen de réponse</p>
                <p className="text-stone-400">Moins de 2 heures ouvrées sur WhatsApp</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-800 text-xs text-stone-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Assistance humaine bienveillante, en français et en wolof.</span>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-8 border border-stone-200 shadow-sm">
          {submitted ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-heading font-black text-2xl text-stone-900">
                Message envoyé avec succès !
              </h3>
              <p className="text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
                Merci <strong>{name}</strong>. Votre message a été enregistré et transmis à la boîte de réception de notre équipe.
              </p>
              <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-900 font-medium max-w-sm mx-auto border border-amber-200">
                Astuce : Vous pouvez basculer en mode <strong>Super Admin</strong> dans la barre supérieure pour voir ce message arriver en direct dans la console.
              </div>
              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setName('');
                    setEmail('');
                    setPhone('+221 ');
                    setSubject('');
                    setMessage('');
                  }}
                  className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold"
                >
                  Envoyer un autre message
                </button>
                <button
                  onClick={() => setCurrentView('home')}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Retour à l'accueil
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-heading font-bold text-xl text-stone-900 mb-1">
                Envoyez-nous un message
              </h3>
              <p className="text-xs text-stone-500 mb-4">
                Tous les champs marqués d'une étoile (*) sont obligatoires.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Votre Nom & Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Cheikh Anta Diagne"
                    className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Adresse Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cheikh@exemple.sn"
                    className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Numéro Téléphone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+221 77 000 00 00"
                    className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Sujet de votre demande
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="ex: Question sur les formules"
                    className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Votre Message *
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Décrivez votre projet, vos questions ou le nombre d'articles que vous souhaitez vendre..."
                  className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-6 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm text-sm"
              >
                <span>Envoyer ma demande</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

      </div>

    </div>
  );
};
