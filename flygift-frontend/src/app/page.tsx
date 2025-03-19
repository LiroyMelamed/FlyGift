import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login/LoginPage'); // Redirect to the login route
}