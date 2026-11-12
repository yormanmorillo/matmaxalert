import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Un error de render en un kiosko no debe dejar la pantalla en blanco:
 * mostramos un fallback accionable y registramos el error.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  private reload = () => {
    window.location.reload();
  };

  private restartSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.hash = '#/';
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Algo salió mal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            La interfaz encontró un error inesperado. Puedes recargar la pantalla; si persiste,
            reinicia la sesión.
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={this.reload}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-md transition-colors"
            >
              Recargar
            </button>
            <button
              type="button"
              onClick={this.restartSession}
              className="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-2.5 rounded-md transition-colors"
            >
              Reiniciar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }
}
