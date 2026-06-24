import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import { toast } from 'sonner';
import { registerUser } from '../lib/storage';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || form.password.length < 6) {
      toast.error('VERIFICA OS DADOS (PASSWORD MÍN. 6)');
      return;
    }
    const result = registerUser({ name: form.name, email: form.email, password: form.password });
    if (!result.ok) {
      toast.error(result.error.toUpperCase());
      return;
    }
    toast.success('CONTA CRIADA — AGUARDA VALIDAÇÃO');
    setTimeout(() => navigate('/'), 800);
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md fade-up">
          <div className="mb-8">
            <Logo size="md" />
          </div>

          <h2 className="font-display text-4xl lg:text-5xl uppercase leading-none mb-7">
            Criar Conta
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {[
              { key: 'name', label: 'Nome', type: 'text', placeholder: 'Pedro Pipa' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'treinador@equipa.pt' },
              { key: 'password', label: 'Password (mín. 6)', type: 'password', placeholder: '••••••••' },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-[10px] tracking-label uppercase text-white/60 mb-2">
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full bg-[#141414] border border-white/10 px-4 py-3 text-sm outline-none transition-colors focus:border-neon focus:bg-[#181818] rounded-sm"
                  placeholder={f.placeholder}
                />
              </div>
            ))}

            <button
              type="submit"
              className="w-full bg-neon text-black font-display text-xl tracking-wider uppercase py-3.5 rounded-sm transition-all hover:bg-[#bbdc0d] active:scale-[0.99]"
            >
              Criar Conta
            </button>
          </form>

          <div className="text-sm text-white/60 mt-7">
            Já tem conta?{' '}
            <Link to="/" className="text-neon hover:underline">
              Entrar
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
