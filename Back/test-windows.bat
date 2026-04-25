@echo off
REM Script de test Windows pour MonoDrien Backend
REM Alternative aux scripts npm qui peuvent avoir des problèmes de guillemets

echo.
echo 🧪 TESTS MONODRIEN BACKEND - VERSION WINDOWS
echo ==========================================
echo.

if "%1"=="auth" (
    echo 🔐 Lancement des tests d'authentification...
    npx jest --testPathPattern=auth --testPathPattern=user --verbose
    goto :eof
)

if "%1"=="game" (
    echo 🎮 Lancement des tests utilitaires...
    npx jest --testPathPattern=game --verbose
    goto :eof
)

if "%1"=="integration" (
    echo 🔗 Lancement des tests d'intégration...
    npx jest --testPathPattern=integration --verbose
    goto :eof
)

if "%1"=="security" (
    echo 🛡️ Lancement des tests de sécurité...
    npx jest --testPathPattern=security --verbose
    goto :eof
)

if "%1"=="performance" (
    echo ⚡ Lancement des tests de performance...
    npx jest --testPathPattern=performance --verbose --runInBand
    goto :eof
)

if "%1"=="coverage" (
    echo 📊 Lancement avec couverture de code...
    npx jest --coverage --verbose
    goto :eof
)

if "%1"=="all" (
    echo 🚀 Lancement de tous les tests...
    echo.
    echo Tests d'authentification:
    npx jest --testPathPattern=auth --testPathPattern=user --verbose
    echo.
    echo Tests utilitaires:
    npx jest --testPathPattern=game --verbose
    echo.
    echo Tests d'intégration:
    npx jest --testPathPattern=integration --verbose
    echo.
    echo Tests de sécurité:
    npx jest --testPathPattern=security --verbose
    echo.
    echo Tests de performance:
    npx jest --testPathPattern=performance --verbose --runInBand
    goto :eof
)

REM Usage par défaut
echo Usage: test-windows.bat [option]
echo.
echo Options disponibles:
echo   auth         Tests d'authentification
echo   game         Tests utilitaires de jeu
echo   integration  Tests d'intégration
echo   security     Tests de sécurité
echo   performance  Tests de performance
echo   coverage     Tests avec couverture de code
echo   all          Tous les tests
echo.
echo Exemples:
echo   test-windows.bat auth
echo   test-windows.bat coverage
echo   test-windows.bat all
echo.
echo Alternative: npm test (tests simples)