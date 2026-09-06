import Image from "next/image";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center text-center">
          <Image src="/logo-mark.png" alt="" width={72} height={72} />
          <p className="mt-4 font-heading text-3xl italic text-foreground">Tally Stack</p>
          <p className="mt-1 text-sm text-muted-foreground">Create an account</p>
        </div>

        <SignupForm />
      </div>
    </main>
  );
}
