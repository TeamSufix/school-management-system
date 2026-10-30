import LoginForm from "@/components/auth/LoginForm";
import PlatformSupport from "@/components/auth/PlatformSupport";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 p-6">
      <LoginForm />
      <PlatformSupport />
    </main>
  );
}
