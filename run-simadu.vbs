' =============================================================================
' run-simadu.vbs — SIMADU Local Dev Launcher
' Double-click file ini untuk menjalankan SIMADU di lokal.
'
' Yang dilakukan skrip ini:
'   1. Memastikan Laragon (Apache + MySQL) sudah berjalan
'   2. Menjalankan Vite dev server di /frontend (background)
'   3. Menunggu Vite siap, lalu membuka browser ke http://localhost:5173
' =============================================================================
Option Explicit

Dim oShell, oFSO
Dim projectRoot, frontendDir, laragonExe

Set oShell = CreateObject("WScript.Shell")
Set oFSO   = CreateObject("Scripting.FileSystemObject")

' ── Path setup ────────────────────────────────────────────────────────────────
projectRoot = oFSO.GetParentFolderName(WScript.ScriptFullName)
frontendDir = projectRoot & "\frontend"
laragonExe  = "C:\laragon\laragon.exe"

' ── Step 1: Pastikan Laragon berjalan ────────────────────────────────────────
If oFSO.FileExists(laragonExe) Then
    Dim oWMI, oProcs
    Set oWMI   = GetObject("winmgmts:{impersonationLevel=impersonate}!\\.\root\cimv2")
    Set oProcs = oWMI.ExecQuery("SELECT * FROM Win32_Process WHERE Name='laragon.exe'")

    If oProcs.Count = 0 Then
        ' Laragon belum berjalan — jalankan dulu
        oShell.Run """" & laragonExe & """", 1, False
        ' Tunggu Laragon start Apache + MySQL (sekitar 4 detik)
        WScript.Sleep 4000
    End If
    Set oProcs = Nothing
    Set oWMI   = Nothing
Else
    ' Laragon tidak ditemukan — tampilkan warning tapi tetap lanjut
    MsgBox "Laragon tidak ditemukan di:" & vbCrLf & laragonExe & vbCrLf & vbCrLf & _
           "Backend PHP tidak akan tersedia." & vbCrLf & _
           "Install Laragon atau jalankan manual, lalu coba lagi." & vbCrLf & vbCrLf & _
           "Frontend tetap akan dibuka...", _
           vbExclamation, "SIMADU — Laragon tidak ditemukan"
End If

' ── Step 2: Jalankan Vite dev server (background) ─────────────────────────────
' Cek apakah Vite sudah berjalan di port 5173
' (sederhana: langsung jalankan, Vite akan gagal dengan pesan jika port sudah terpakai)
Dim viteCmd
viteCmd = "cmd /c cd /d """ & frontendDir & """ && npm run dev"
oShell.Run viteCmd, 0, False   ' 0 = window hidden, False = tidak tunggu selesai

' ── Step 3: Tunggu Vite siap, lalu buka browser ─────────────────────────────
' Vite biasanya ready dalam 2-3 detik pada cold start
WScript.Sleep 3500

oShell.Run "http://localhost:5173", 1, False

' ── Cleanup ───────────────────────────────────────────────────────────────────
Set oShell = Nothing
Set oFSO   = Nothing
