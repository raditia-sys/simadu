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
  
  // delete assets, index.html, etc.
  @rrmdir(__DIR__ . '/assets');
  @unlink(__DIR__ . '/index.html');
  
  $zip = new ZipArchive;
  $res = $zip->open('frontend_dist2.zip');
  if ($res === TRUE) {
    @rrmdir(__DIR__ . '/extracted');
    $zip->extractTo(__DIR__ . '/extracted');
    $zip->close();
    echo "Extracted successfully.\n";
    
    // Now move files from extracted/dist to __DIR__
    $src = __DIR__ . '/extracted/dist';
    $dest = __DIR__;
    
    function recurse_copy($src, $dst) { 
        $dir = opendir($src); 
        @mkdir($dst); 
        while(false !== ( $file = readdir($dir)) ) { 
            if (( $file != '.' ) && ( $file != '..' )) { 
                if ( is_dir($src . '/' . $file) ) { 
                    recurse_copy($src . '/' . $file, $dst . '/' . $file); 
                } 
                else { 
                    copy($src . '/' . $file, $dst . '/' . $file); 
                } 
            } 
        } 
        closedir($dir); 
    }
    
    recurse_copy($src, $dest);
    echo "Copied successfully.\n";
  } else {
    echo "Failed to open zip\n";
  }
