<?php
  function rrmdir($dir) { 
    if (is_dir($dir)) { 
      $objects = scandir($dir); 
      foreach ($objects as $object) { 
        if ($object != "." && $object != "..") { 
          if (is_dir($dir. DIRECTORY_SEPARATOR .$object) && !is_link($dir."/".$object))
            rrmdir($dir. DIRECTORY_SEPARATOR .$object);
          else
            unlink($dir. DIRECTORY_SEPARATOR .$object); 
        } 
      }
      rmdir($dir); 
    } 
  }
  
  @rrmdir(__DIR__ . '/assets');
  @unlink(__DIR__ . '/index.html');
  
  $zip = new ZipArchive;
  $res = $zip->open(__DIR__ . '/deploy_fix2.zip');
  if ($res === TRUE) {
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $filename = $zip->getNameIndex($i);
        $fixedName = str_replace('\\', '/', $filename);
        
        $dest = __DIR__ . '/' . $fixedName;
        
        if (substr($filename, -1) == '/' || substr($filename, -1) == '\\') {
            @mkdir($dest, 0777, true);
        } else {
            $dir = dirname($dest);
            if (!is_dir($dir)) {
                @mkdir($dir, 0777, true);
            }
            file_put_contents($dest, $zip->getFromIndex($i));
        }
    }
    $zip->close();
    echo "Extracted successfully.\n";
  } else {
    echo "Failed to open zip: " . $res . "\n";
  }
