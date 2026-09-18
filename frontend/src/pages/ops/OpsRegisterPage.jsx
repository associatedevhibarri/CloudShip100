import { Link } from 'react-router-dom'
import { OpsAuthShell } from './OpsAuthShell'

export default function OpsRegisterPage() {
  return (
    <OpsAuthShell
      eyebrow="Operations"
      title="Invite only"
      subtitle="Operator accounts are created by an administrator. Ask your CloudShip admin to send an invite."
      footer={
        <Link to="/ops/login" className="font-semibold text-white/70 transition hover:text-white">
          Back to sign in
        </Link>
      }
    >
          <p className="text-sm text-white/60">
            Public operator signup is closed. A logged-in operator can send an invite from{' '}
            <span className="font-semibold text-white">Operators</span> in the ops app. After the email, set your
            password, then sign in.
          </p>
    </OpsAuthShell>
  )
}
