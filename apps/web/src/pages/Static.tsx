import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Mail, Send, ShieldCheck, Sparkles } from 'lucide-react'

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{title}</h1>
      <div className="glass space-y-4 p-5 text-[15px] leading-relaxed text-ink/85 sm:p-7">{children}</div>
    </div>
  )
}
const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="font-display text-lg font-bold text-ink">{children}</h2>
const P = ({ children }: { children: React.ReactNode }) => <p>{children}</p>

export function About() {
  return (
    <Page title="About Crush and Confo">
      <p className="flex items-center gap-2 text-lg font-semibold"><Heart className="h-5 w-5 fill-pink text-pink" /> Confess. Connect. Match.</p>
      <P>Crush and Confo is a community for honest expression and genuine connection. It brings together three things in one place: anonymous confessions, a friendly community feed, and thoughtful matching — matching is one part of the site, not the whole site.</P>
      <H2>What you can do here</H2>
      <ul className="list-disc space-y-1 pl-5"><li>Confess anonymously, or share openly — always with kindness.</li><li>Meet people through shared interests, location and intentions.</li><li>Chat only after a mutual match, so conversations start with consent.</li><li>Follow friends, save posts, and join trending topics like #Love, #Crush and #Friendship.</li></ul>
      <H2>Our promise</H2>
      <P>Everyone here is 18 or older. Reports are reviewed, blocks are respected, and your anonymous confessions are never traced back to you. Match percentages are compatibility estimates based on shared interests, location and age proximity — they are not scientifically validated.</P>
      <Link to="/register" className="btn-gradient">Join the community</Link>
    </Page>
  )
}

export function Contact() {
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  return (
    <Page title="Contact us">
      <P>Questions, feedback or a safety concern? Write to us — we read every message.</P>
      {sent ? (
        <p className="rounded-2xl bg-success/10 p-4 font-semibold text-success" role="status">Thank you! Your message has been sent. We will reply to {form.email}.</p>
      ) : (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
          <div><label className="label" htmlFor="c-name">Name</label><input id="c-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label" htmlFor="c-email">Email</label><input id="c-email" type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label" htmlFor="c-msg">Message</label><textarea id="c-msg" rows={4} className="input resize-none" required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          <button className="btn-gradient" type="submit"><Send className="h-4 w-4" /> Send message</button>
        </form>
      )}
      <P><Mail className="mr-1 inline h-4 w-4" /> For urgent safety issues, use Report on the relevant post or profile — moderators review reports first.</P>
    </Page>
  )
}

export function Privacy() {
  return (
    <Page title="Privacy Policy">
      <P><strong>Last updated:</strong> 27 November 2026. Crush and Confo is built for adults 18+.</P>
      <H2>What we collect</H2>
      <P>Your profile information (name, username, date of birth, gender, location, interests), the content you post, and messages you send after a mutual match. Anonymous confessions are stored without a link to your identity.</P>
      <H2>How we use it</H2>
      <P>To run matching, show you the community feed, deliver notifications, and keep the platform safe. We do not sell your personal data.</P>
      <H2>Your control</H2>
      <P>You can edit your profile, block or report anyone, download or delete your account from Settings. Deleting your account removes your profile, posts and messages.</P>
      <H2>Cookies & sessions</H2>
      <P>Sign-in uses a secure HttpOnly session cookie. In demo mode only, a dev session marker is kept in your browser's session storage — production never stores tokens in localStorage.</P>
    </Page>
  )
}

export function Terms() {
  return (
    <Page title="Terms of Service">
      <P>By using Crush and Confo you agree to these terms. You must be 18 or older — the server enforces this from your date of birth at registration.</P>
      <H2>Your responsibilities</H2>
      <ul className="list-disc space-y-1 pl-5"><li>Be honest about who you are; impersonation is not allowed.</li><li>Do not harass, threaten, or share anyone's private information.</li><li>Do not post sexual content involving minors, or any illegal content.</li><li>You are responsible for what you post and who you meet.</li></ul>
      <H2>Matching</H2>
      <P>Match percentages are compatibility estimates, not scientifically validated, and never guarantee a connection. Chat opens only after a mutual match.</P>
      <H2>Accounts</H2>
      <P>We may suspend accounts that break these terms or our Community Guidelines. You may delete your account at any time from Settings.</P>
    </Page>
  )
}

export function Guidelines() {
  return (
    <Page title="Community Guidelines">
      <P><Sparkles className="mr-1 inline h-4 w-4 text-purple" /> Our community works when everyone feels safe to be honest.</P>
      <H2>Do</H2>
      <ul className="list-disc space-y-1 pl-5"><li>Be kind and respectful, even when you disagree.</li><li>Ask before sharing anything personal.</li><li>Report content that breaks these rules — reports are reviewed by moderators.</li></ul>
      <H2>Don't</H2>
      <ul className="list-disc space-y-1 pl-5"><li>No harassment, hate speech, or threats.</li><li>No spam, scams, or requests for money.</li><li>No explicit content or sharing private photos without consent.</li><li>Never try to identify an anonymous confessor.</li></ul>
      <P>Breaking these guidelines can lead to warnings, suspension, or a permanent ban.</P>
    </Page>
  )
}

export function Safety() {
  return (
    <Page title="Safety">
      <P><ShieldCheck className="mr-1 inline h-4 w-4 text-success" /> Meeting people online should feel safe. These tips help.</P>
      <H2>Protect yourself</H2>
      <ul className="list-disc space-y-1 pl-5"><li>Never send money to someone you met online, and never share passwords or one-time codes.</li><li>Keep early conversations on Crush and Confo — chat only opens after a mutual match.</li><li>Meet in a public place first, tell a friend where you are going, and arrange your own transport.</li><li>Trust your instincts: if something feels wrong, block and report.</li></ul>
      <H2>If something happens</H2>
      <P>Use Report on any post, profile or message, or Block the person — they will not be able to contact you. For serious threats, contact local authorities.</P>
      <P>Match percentages are estimates, not guarantees about a person. Take your time getting to know someone.</P>
    </Page>
  )
}
