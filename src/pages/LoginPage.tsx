import { Header } from '../components/Header'
import { Hero } from '../components/Hero'
import { LoginForm } from '../components/LoginForm'
import '../App.css'

function LoginPage() {
  return (
    <main className="page-shell">
      <Header />
      <section className="hero-section">
        <Hero />
      </section>
      <LoginForm />
    </main>
  )
}

export { LoginPage }
