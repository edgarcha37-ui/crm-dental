import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const metadata = {
    title: 'Iniciar Sesión — DentalCRM',
};

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginForm />
        </Suspense>
    );
}
